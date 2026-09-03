"""
Tests backend topic read/creation.
"""


def test_create_topic_success(auth_client, valid_topic_payload):
    """
    Ensure the topic is created correctly.
    """
    response = auth_client.post("/topics/", json=valid_topic_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Krankenkassenreform 2026"


def test_get_topics_list(auth_client, valid_topic_payload):
    """
    Ensure topics are retrieved as a list.
    """
    auth_client.post("/topics/", json=valid_topic_payload)
    response = auth_client.get("/topics/")
    assert response.status_code == 200
    topics = response.json()
    assert isinstance(topics, list)
    assert any(t["label"] == "Krankenkassenreform 2026" for t in topics)


def test_update_topic_success(auth_client, valid_topic_payload):
    """
    Ensure the topic is correctly updated.
    """
    response = auth_client.post("/topics/", json=valid_topic_payload)
    topic_id = response.json()["id"]

    response = auth_client.put(f"/topics/{topic_id}", json={"label": "Bundestagswahl"})
    assert response.status_code == 200
    assert response.json()["label"] == "Bundestagswahl"


def test_update_topic_not_found(auth_client):
    """
    Ensure the status code 404 is returned.
    """
    response = auth_client.put("/topics/9999", json={})
    assert response.status_code == 404


def test_delete_topic_success(auth_client, valid_topic_payload):
    """
    Ensure the topic is correctly deleted.
    """
    response = auth_client.post("/topics/", json=valid_topic_payload)
    topic_id = response.json()["id"]

    response = auth_client.delete(f"/topics/{topic_id}")
    assert response.status_code == 204

    response = auth_client.get("/topics/")
    topics = response.json()
    assert not any(t["id"] == topic_id for t in topics)


def test_delete_topic_not_found(auth_client):
    """
    Ensure the status code 404 is returned.
    """
    response = auth_client.delete("/topics/9999")
    assert response.status_code == 404


def test_create_topic_duplicate_returns_409(auth_client, valid_topic_payload):
    """
    Ensure a second POST with the same label returns HTTP 409.
    """
    auth_client.post("/topics/", json=valid_topic_payload)
    response = auth_client.post("/topics/", json=valid_topic_payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "A topic with this label already exists."


def test_update_topic_duplicate_returns_409(
    auth_client, valid_topic_payload, second_topic_payload
):
    """
    Ensure updating a topic's label to collide with another topic returns HTTP 409.
    """
    auth_client.post("/topics/", json=valid_topic_payload)
    response = auth_client.post("/topics/", json=second_topic_payload)
    second_id = response.json()["id"]

    response = auth_client.put(
        f"/topics/{second_id}", json={"label": valid_topic_payload["label"]}
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "A topic with this label already exists."
