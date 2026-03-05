"""
Tests backend word read/creation.
"""


def test_create_word_success(client, valid_word_payload):
    """
    Ensure the word is created correctly.
    """
    response = client.post("/words/", json=valid_word_payload)
    assert response.status_code == 200
    assert response.json()["word"] == "Zuschlag"


def test_get_words_list(client):
    """
    Ensure words are retrieved.
    """
    response = client.get("/words/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_word_success(client, valid_word_payload):
    """
    Ensure the word is correctly updated.
    """
    # Create word
    response = client.post("/words/", json=valid_word_payload)
    word_id = response.json()["id"]

    # Update the category
    update_payload = {"example_sentences": "Der Zuschlag wurde abgeführt"}
    response = client.put(f"/words/{word_id}", json=update_payload)

    assert response.status_code == 200
    assert response.json()["example_sentences"] == "Der Zuschlag wurde abgeführt"
    assert response.json()["word"] == "Zuschlag"


def test_update_word_not_found(client):
    """
    Ensure the status code 404 is returned.
    """
    response = client.put("/words/9999", json={})
    assert response.status_code == 404


def test_delete_word_success(client, valid_word_payload):
    """
    Esnture the word is correctly deleted.
    """

    # Create word
    response = client.post("/words/", json=valid_word_payload)
    word_id = response.json()["id"]

    # Delete word
    response = client.delete(f"/words/{word_id}")
    assert response.status_code == 204

    # Ensure word is not present anymore in db
    response = client.get("/words/")
    words = response.json()
    assert not any(word["id"] == word_id for word in words)


def test_delete_word_not_found(client):
    """
    Ensure the status code 404 is returned.
    """
    response = client.delete("/words/9999")
    assert response.status_code == 404
