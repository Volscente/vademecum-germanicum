"""
Tests backend authentication: registration, login, and per-user data isolation.
"""

from backend import auth


def test_register_allowed_username_success(client):
    response = client.post(
        "/auth/register", json={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_register_disallowed_username_rejected(client):
    response = client.post(
        "/auth/register", json={"username": "not-on-the-list", "password": "x"}
    )
    assert response.status_code == 403


def test_register_duplicate_username_returns_409(client):
    payload = {"username": "testuser", "password": "testpassword"}
    client.post("/auth/register", json=payload)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 409


def test_login_success(client):
    client.post(
        "/auth/register", json={"username": "testuser", "password": "testpassword"}
    )
    response = client.post(
        "/auth/login", data={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password_returns_401(client):
    client.post(
        "/auth/register", json={"username": "testuser", "password": "testpassword"}
    )
    response = client.post(
        "/auth/login", data={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_login_unknown_username_returns_401(client):
    response = client.post(
        "/auth/login", data={"username": "ghost", "password": "whatever"}
    )
    assert response.status_code == 401


def test_unauthenticated_word_request_returns_401(client):
    response = client.get("/words/")
    assert response.status_code == 401


def test_cross_user_word_access_returns_404(
    auth_client, second_test_user, valid_word_payload
):
    """A user cannot update or delete another user's word — 404, not 403."""
    response = auth_client.post("/words/", json=valid_word_payload)
    word_id = response.json()["id"]

    other_token = auth.create_access_token({"sub": second_test_user.username})
    other_headers = {"Authorization": f"Bearer {other_token}"}

    response = auth_client.put(
        f"/words/{word_id}", json={"translation": "Hijacked"}, headers=other_headers
    )
    assert response.status_code == 404

    response = auth_client.delete(f"/words/{word_id}", headers=other_headers)
    assert response.status_code == 404


def test_cross_user_resource_access_returns_404(
    auth_client, second_test_user, valid_resource_payload
):
    response = auth_client.post("/resources/", json=valid_resource_payload)
    resource_id = response.json()["id"]

    other_token = auth.create_access_token({"sub": second_test_user.username})
    other_headers = {"Authorization": f"Bearer {other_token}"}

    response = auth_client.put(
        f"/resources/{resource_id}", json={"name": "Hijacked"}, headers=other_headers
    )
    assert response.status_code == 404

    response = auth_client.delete(f"/resources/{resource_id}", headers=other_headers)
    assert response.status_code == 404


def test_cross_user_topic_access_returns_404(
    auth_client, second_test_user, valid_topic_payload
):
    response = auth_client.post("/topics/", json=valid_topic_payload)
    topic_id = response.json()["id"]

    other_token = auth.create_access_token({"sub": second_test_user.username})
    other_headers = {"Authorization": f"Bearer {other_token}"}

    response = auth_client.put(
        f"/topics/{topic_id}", json={"label": "Hijacked"}, headers=other_headers
    )
    assert response.status_code == 404

    response = auth_client.delete(f"/topics/{topic_id}", headers=other_headers)
    assert response.status_code == 404


def test_word_list_excludes_other_users_words(
    auth_client, second_test_user, valid_word_payload
):
    """GET /words/ only returns the caller's own words."""
    auth_client.post("/words/", json=valid_word_payload)

    other_token = auth.create_access_token({"sub": second_test_user.username})
    response = auth_client.get(
        "/words/", headers={"Authorization": f"Bearer {other_token}"}
    )
    assert response.status_code == 200
    assert not any(w["word"] == valid_word_payload["word"] for w in response.json())
