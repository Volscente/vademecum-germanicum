"""
Tests backend topic read/creation.
"""


def test_create_topic_success(client, valid_topic_payload):
    """
    Ensure the topic is created correctly.
    """
    response = client.post("/topics/", json=valid_topic_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Krankenkassenreform 2026"


def test_get_topics_list(client, valid_topic_payload):
    """
    Ensure topics are retrieved as a list.
    """
    client.post("/topics/", json=valid_topic_payload)
    response = client.get("/topics/")
    assert response.status_code == 200
    topics = response.json()
    assert isinstance(topics, list)
    assert any(t["label"] == "Krankenkassenreform 2026" for t in topics)


def test_update_topic_success(client, valid_topic_payload):
    """
    Ensure the topic is correctly updated.
    """
    response = client.post("/topics/", json=valid_topic_payload)
    topic_id = response.json()["id"]

    response = client.put(f"/topics/{topic_id}", json={"label": "Bundestagswahl"})
    assert response.status_code == 200
    assert response.json()["label"] == "Bundestagswahl"


def test_update_topic_not_found(client):
    """
    Ensure the status code 404 is returned.
    """
    response = client.put("/topics/9999", json={})
    assert response.status_code == 404


def test_delete_topic_success(client, valid_topic_payload):
    """
    Ensure the topic is correctly deleted.
    """
    response = client.post("/topics/", json=valid_topic_payload)
    topic_id = response.json()["id"]

    response = client.delete(f"/topics/{topic_id}")
    assert response.status_code == 204

    response = client.get("/topics/")
    topics = response.json()
    assert not any(t["id"] == topic_id for t in topics)


def test_delete_topic_not_found(client):
    """
    Ensure the status code 404 is returned.
    """
    response = client.delete("/topics/9999")
    assert response.status_code == 404


def test_create_topic_duplicate_returns_409(client, valid_topic_payload):
    """
    Ensure a second POST with the same label returns HTTP 409.
    """
    client.post("/topics/", json=valid_topic_payload)
    response = client.post("/topics/", json=valid_topic_payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "A topic with this label already exists."


def test_update_topic_duplicate_returns_409(
    client, valid_topic_payload, second_topic_payload
):
    """
    Ensure updating a topic's label to collide with another topic returns HTTP 409.
    """
    client.post("/topics/", json=valid_topic_payload)
    response = client.post("/topics/", json=second_topic_payload)
    second_id = response.json()["id"]

    response = client.put(
        f"/topics/{second_id}", json={"label": valid_topic_payload["label"]}
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "A topic with this label already exists."
