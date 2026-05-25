# [HOTFIX] Unit tests write to the production database

**Severity:** high
**Affected versions:** current
**Environments:** local development
**Tech stack:** Python, FastAPI, PostgreSQL, SQLAlchemy, pytest

---

## Symptom

Unit tests executed via `just run_tests` write data to the production PostgreSQL database (`vademecum_db`). After a test run, records created by the tests persist in the production database instead of being discarded.

---

## Root Cause Analysis

The `db_session` fixture in `database_management.py` opens a `SessionLocal` connection and registers a transaction for rollback. However, it never overrides the FastAPI `get_db` dependency. Because of this, HTTP requests made through `TestClient` call the real `get_db`, which opens its own independent `SessionLocal` session bound directly to `DATABASE_URL`. Writes in those sessions are committed permanently and are invisible to the fixture's rollback.

```
Test function
│
├── db_session fixture
│   └── SessionLocal() ──► BEGIN / ROLLBACK   ← only this session is rolled back
│
└── TestClient(app)
    └── HTTP request → FastAPI → get_db()
                                  └── SessionLocal() ──► COMMIT  ← escapes rollback
                                                                      ↓
                                                               vademecum_db (permanent)
```

The transaction rollback in `db_session` is therefore a no-op with respect to the data written through TestClient, because the two sessions are entirely independent connections to the database.

---

## Technical Scope

**In scope:**

- `backend/tests/fixtures/database_management.py` — fix the `db_session` fixture to override `get_db` and bind TestClient requests to the rolled-back session.

**Out of scope:**

- Refactoring production database code: separate initiative.
- Adding a dedicated test database container: the rollback approach is sufficient.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
|------|--------|-------------|
| `backend/tests/fixtures/database_management.py` | Modify | Override `get_db` in `db_session`; bind the test session to a connection-level transaction so that route `commit()` calls do not escape the rollback. |

### Key Changes

**`backend/tests/fixtures/database_management.py`**

Replace the current `db_session` fixture with a version that:

1. Opens a raw engine connection and begins an explicit outer transaction.
2. Creates a new `Session` bound to that connection so all SQL runs over the same underlying connection.
3. Overrides `app.dependency_overrides[get_db]` with a generator that yields the bound session — this ensures every FastAPI route that declares `db: Session = Depends(get_db)` receives the same session as the test.
4. Rolls back the outer connection-level transaction in `finally`, which undoes all writes regardless of any `session.commit()` calls made by route handlers during the test.
5. Clears the dependency override in `finally` to avoid state leakage between tests.

```python
"""
Database management fixtures.
"""

import pytest
from sqlalchemy.orm import Session, sessionmaker
from backend.database import engine, get_db
from backend.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    """Provides a single TestClient for the whole test session."""
    return TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def db_session():
    """
    Open a connection-level transaction and inject it into the FastAPI app
    via dependency_overrides so all writes — both direct and via TestClient
    HTTP requests — are covered by the rollback.
    """
    connection = engine.connect()
    transaction = connection.begin()
    bound_session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()

    app.dependency_overrides[get_db] = lambda: iter([bound_session])

    try:
        yield bound_session
    finally:
        transaction.rollback()
        bound_session.close()
        connection.close()
        app.dependency_overrides.pop(get_db, None)
```

**Why a connection-level transaction instead of `SessionLocal()`:**

`SessionLocal()` wraps a connection with `autocommit=False`, meaning each `session.commit()` call inside a route handler commits directly to the database. Binding a new `Session` to a raw `connection` that already holds an outer `transaction` means route-handler commits flush data to the connection but cannot advance past the outer transaction — so `transaction.rollback()` always undoes everything.

---

## Verification

### Manual checks

1. Run the full test suite:
   ```bash
   just run_tests
   ```
   All tests must pass with exit code `0`.

2. After the test run, connect to the production database and verify no test data was written:
   ```bash
   docker exec -it vademecum_db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM word;"
   ```
   The row count must match the count before the test run.

### Edge cases to validate

- Tests that assert on data inserted earlier in the same test function — these rely on the bound session seeing its own uncommitted writes, which it will because both the test and the routes share the same session.
- Tests that call multiple HTTP endpoints in sequence within one test function — each call reuses the same session via the override, so state is visible across calls within the test and rolled back at the end.

---

## Open Questions / Risks

- [ ] **Session sharing changes assertion behaviour:** Tests that currently read back data through the direct `connection` object and data written via TestClient may now see it correctly for the first time. Review test assertions that previously relied on the two sessions being independent. **Target:** before merging
- [ ] **Background tasks outside DI:** If any route spawns a background task that opens its own DB session (e.g. `BackgroundTasks` calling a function that constructs its own `SessionLocal()`), those sessions bypass the override and still hit the production database. Audit routes for background DB writes if tests reveal unexpected data after the fix. **Target:** TBD
- [ ] **SQLAlchemy version compatibility:** The `Session(bind=connection)` / `sessionmaker(bind=connection)` pattern is deprecated in SQLAlchemy 2.x. If the project upgrades to 2.x, migrate to `Session(bind=connection)` → `with Session(connection) as session:` and the `connection.begin()` context manager pattern. **Target:** TBD
