---
title: "Unit tests write to the production database"
project: "vademecum-germanicum"
author: "Simone Porreca"
severity: "high"
affected-versions:
  - "current"
environments:
  - "local development"
tech-stack:
  - "Python"
  - "FastAPI"
  - "PostgreSQL"
  - "SQLAlchemy"
  - "pytest"
context-paths:
  - "backend/tests/fixtures/database_management.py"
  - "backend/src/backend/database.py"
  - "backend/src/backend/main.py"
  - "docker-compose.yml"
  - "backend/README.md"
---

## Symptom

Unit tests executed via `just run_tests` write data to the production PostgreSQL database (`vademecum_db`). After a test run, records created by the tests persist in the production database instead of being discarded.

## Root cause

The `db_session` fixture in `database_management.py` opens a `SessionLocal` connection and rolls it back after each test. However, it never overrides the `get_db` dependency in the FastAPI app. The `TestClient` therefore uses the real `get_db` function for every HTTP request, which opens its own independent session against `DATABASE_URL` (the production database). The rollback in `db_session` only affects the direct `connection` object in the fixture, not the sessions created by `get_db` during test execution — so all writes committed through the TestClient are permanent.

## Fix approach

Override the `get_db` FastAPI dependency in the test fixtures to inject the transactional session that gets rolled back. The `db_session` fixture should yield a session that is both:

1. Used directly by any test that needs it.
2. Injected into the FastAPI app via `app.dependency_overrides[get_db]` so that TestClient HTTP requests also use the same rolled-back session.

The override must be cleaned up after each test to avoid leaking state between tests.

## Verification steps

1. Run `just run_tests` — all existing tests must pass.
2. Connect to the production database after the test run and confirm no test data was persisted (e.g. `SELECT * FROM word;` returns only pre-existing rows, none added by tests).

## Scope

**In scope:**

- Fix `backend/tests/fixtures/database_management.py` to override the `get_db` dependency so all test HTTP requests are routed through the rolled-back session.

**Out of scope:**

- Refactoring production database code: separate initiative.
- Adding a dedicated test database container: out of scope for this hotfix; the rollback approach is sufficient.

## Known risks

- Tests that currently assert side effects via the direct `connection` object may behave differently once the TestClient shares the same session; review test assertions after the fix.
- If any test spawns background tasks that open their own DB sessions outside of FastAPI's DI, those sessions will not be captured by the override and would still hit the production database.
