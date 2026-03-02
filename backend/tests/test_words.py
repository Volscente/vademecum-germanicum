"""
Tests backend word read/creation.
"""


def test_create_word_success(client, valid_word_payload):
    response = client.post("/words/", json=valid_word_payload)
    assert response.status_code == 200
    assert response.json()["word"] == "Zuschlag"


def test_get_words_list(client):
    response = client.get("/words/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_word_success(client, valid_word_payload):
    # Create word
    response = client.post("/words/", json=valid_word_payload)
    word_id = response.json()["id"]

    # Update the category
    update_payload = {"example_sentences": "Der Zuschlag wurde abgeführt"}
    response = client.put(f"/words/{word_id}", json=update_payload)

    assert response.status_code == 200
    assert response.json()["example_sentences"] == "Der Zuschlag wurde abgeführt"
    assert response.json()["word"] == "Zuschlag"
