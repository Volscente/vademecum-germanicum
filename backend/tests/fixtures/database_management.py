"""
Database management fixtures.
"""

import pytest
from sqlalchemy import event, text
from sqlalchemy.orm import Session
from backend.database import engine, get_db
from backend.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def apply_migrations():
    """Ensure schema constraints from SQL migrations are present in the test DB.

    create_all() only creates tables that don't exist yet — it never alters
    existing tables. This fixture idempotently applies migrations that add
    constraints so that constraint-dependent tests work against the live
    vademecum_db container regardless of when the container was first created.
    """
    with engine.connect() as conn:
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'words_word_key'
                    ) THEN
                        ALTER TABLE words ADD CONSTRAINT words_word_key UNIQUE (word);
                    END IF;
                END $$;
                """
            )
        )
        conn.commit()


@pytest.fixture(scope="session")
def client():
    """Provides a single TestClient for the whole test session."""
    return TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def db_session():
    """
    Open a raw connection-level transaction, bind a Session to it, and add a
    SAVEPOINT so that route-level commit() calls only release the SAVEPOINT
    (not the outer connection transaction). Override get_db so every FastAPI
    route in TestClient uses this same session. In teardown, session.close()
    followed by trans.rollback() sends a real ROLLBACK to PostgreSQL,
    discarding all test writes.
    """
    connection = engine.connect()
    trans = connection.begin()
    session = Session(bind=connection)
    nested = session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, t):
        nonlocal nested
        if not nested.is_active:
            nested = sess.begin_nested()

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield session
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()
        trans.rollback()
        connection.close()
