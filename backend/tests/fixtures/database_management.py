"""
Database management fixtures.
"""

import pytest
from backend.database import SessionLocal
from backend.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    """Provides a single TestClient for the whole test session."""
    return TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def db_session():
    """
    Simulate the function backend/src/backend/database.get_db
    by opening a clear rollback connection to the database.
    """
    connection = SessionLocal()
    # Start a transaction
    transaction = connection.begin()
    try:
        yield connection
    finally:
        # Roll back everything done during the test
        transaction.rollback()
        connection.close()
