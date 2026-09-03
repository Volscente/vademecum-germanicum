"""
Authentication fixtures: a test user and an authenticated TestClient wrapper.
"""

import pytest
from backend import auth, models


@pytest.fixture
def test_user(db_session):
    """Create and persist a test user, returning the ORM instance."""
    user = models.User(
        username="testuser", hashed_password=auth.hash_password("testpassword")
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def second_test_user(db_session):
    """A second, distinct test user — used for cross-user access tests."""
    user = models.User(
        username="otheruser", hashed_password=auth.hash_password("otherpassword")
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def auth_client(client, test_user):
    """The shared TestClient, pre-authenticated as `test_user` via a Bearer token."""
    token = auth.create_access_token({"sub": test_user.username})
    client.headers.update({"Authorization": f"Bearer {token}"})
    yield client
    client.headers.pop("Authorization", None)
