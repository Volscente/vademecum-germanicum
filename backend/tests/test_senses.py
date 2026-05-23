"""
Tests for GET /senses/ and PUT /senses/{sense_id}/review endpoints.
"""


def test_get_senses_returns_list_with_word_fields(client, valid_word_payload):
    """
    GET /senses/ returns a flat list; each item includes word, translation,
    gender, category, difficulty_level, last_reviewed_at.
    """
    client.post("/words/", json=valid_word_payload)
    response = client.get("/senses/")
    assert response.status_code == 200
    senses = response.json()
    assert isinstance(senses, list)
    assert len(senses) >= 1
    sense = senses[0]
    assert "word" in sense
    assert "translation" in sense
    assert "gender" in sense
    assert "category" in sense
    assert "difficulty_level" in sense
    assert "last_reviewed_at" in sense


def test_get_senses_returns_list(client):
    """
    GET /senses/ returns a list (may be empty when no senses exist).
    """
    response = client.get("/senses/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_sense_review_success(client, valid_word_payload):
    """
    PUT /senses/{id}/review with a valid difficulty_level returns HTTP 200,
    last_reviewed_at is set (non-null), and returned difficulty_level matches
    the sent value.
    """
    create_response = client.post("/words/", json=valid_word_payload)
    sense_id = create_response.json()["senses"][0]["id"]

    response = client.put(
        f"/senses/{sense_id}/review",
        json={"difficulty_level": "Hard"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["difficulty_level"] == "Hard"
    assert data["last_reviewed_at"] is not None


def test_update_sense_review_invalid_difficulty(client, valid_word_payload):
    """
    PUT /senses/{id}/review with an invalid difficulty_level string returns HTTP 422.
    """
    create_response = client.post("/words/", json=valid_word_payload)
    sense_id = create_response.json()["senses"][0]["id"]

    response = client.put(
        f"/senses/{sense_id}/review",
        json={"difficulty_level": "InvalidLevel"},
    )
    assert response.status_code == 422


def test_update_sense_review_not_found(client):
    """
    PUT /senses/{id}/review with a non-existent sense_id returns HTTP 404.
    """
    response = client.put(
        "/senses/9999/review",
        json={"difficulty_level": "Easy"},
    )
    assert response.status_code == 404
