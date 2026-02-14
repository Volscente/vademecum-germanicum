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


@pytest.fixture(scope="function")
def db_session():
    """
    Provides a clean database session for each test.
    Cleans up after the test is done.
    """
    connection = SessionLocal()
    try:
        yield connection
    finally:
        connection.close()
