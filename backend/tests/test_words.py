"""
Tests backend word read/creation.
"""


def test_create_word_success(client, valid_word_payload):
    """
    Ensure the word is created correctly with its sense graph.
    """
    response = client.post("/words/", json=valid_word_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["word"] == "Zuschlag"
    assert len(data["senses"]) == 1
    assert data["senses"][0]["meaning_summary"] == "Surcharge"


def test_get_words_list(client):
    """
    Ensure words are retrieved and each has a senses key.
    """
    response = client.get("/words/")
    assert response.status_code == 200
    words = response.json()
    assert isinstance(words, list)
    for word in words:
        assert "senses" in word


def test_search_words_success(client, valid_word_payload):
    """
    Ensure the search filter correctly works based on Words and Translation.
    """
    # Create word
    client.post("/words/", json=valid_word_payload)

    # Search by Word
    response = client.get("/words/?search=Zuschlag")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["word"] == "Zuschlag"

    # Search by Translation
    response = client.get("/words/?search=Surcharge")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["translation"] == "Surcharge"

    # Word not found
    response = client.get("/words/?search=NonEsistentWord")
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_update_word_success(client, valid_word_payload):
    """
    Ensure the word is correctly updated, including replacing its senses.
    """
    # Create word
    response = client.post("/words/", json=valid_word_payload)
    word_id = response.json()["id"]

    # Update with a new translation and a new sense
    update_payload = {
        "translation": "Fee",
        "senses": [
            {
                "meaning_summary": "Additional fee",
                "register": "Formal",
                "grammar_patterns": [{"preposition": None, "case": "Akkusativ"}],
                "example_sentences": [
                    {"german": "Die Gebühr ist fällig.", "english": "The fee is due."}
                ],
            }
        ],
    }
    response = client.put(f"/words/{word_id}", json=update_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["word"] == "Zuschlag"
    assert data["translation"] == "Fee"
    assert len(data["senses"]) == 1
    assert data["senses"][0]["meaning_summary"] == "Additional fee"


def test_update_word_not_found(client):
    """
    Ensure the status code 404 is returned.
    """
    response = client.put("/words/9999", json={})
    assert response.status_code == 404


def test_delete_word_success(client, valid_word_payload):
    """
    Ensure the word is correctly deleted.
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


def test_create_word_with_multiple_senses(client, two_senses_payload):
    """
    Ensure a word created with multiple senses persists all senses with their
    grammar patterns and example sentences.
    """
    response = client.post("/words/", json=two_senses_payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["senses"]) == 2

    # Both senses are returned by GET /words/ with nested data
    word_id = data["id"]
    response = client.get("/words/")
    words = response.json()
    match = next(w for w in words if w["id"] == word_id)
    assert len(match["senses"]) == 2
    assert len(match["senses"][0]["grammar_patterns"]) == 1
    assert len(match["senses"][0]["example_sentences"]) == 1


def test_create_word_empty_senses_rejected(client, valid_word_payload):
    """
    Ensure a word with an empty senses list is rejected with HTTP 422.
    """
    payload = {**valid_word_payload, "senses": []}
    response = client.post("/words/", json=payload)
    assert response.status_code == 422


def test_create_word_empty_grammar_patterns_rejected(client, valid_word_payload):
    """
    Ensure a sense with an empty grammar_patterns list is rejected with HTTP 422.
    """
    payload = {
        **valid_word_payload,
        "senses": [
            {
                "meaning_summary": "Surcharge",
                "register": "Neutral",
                "grammar_patterns": [],
                "example_sentences": [
                    {"german": "Der Zuschlag beträgt 10 Euro.", "english": "The surcharge is 10 euros."}
                ],
            }
        ],
    }
    response = client.post("/words/", json=payload)
    assert response.status_code == 422


def test_create_word_empty_example_sentences_rejected(client, valid_word_payload):
    """
    Ensure a sense with an empty example_sentences list is rejected with HTTP 422.
    """
    payload = {
        **valid_word_payload,
        "senses": [
            {
                "meaning_summary": "Surcharge",
                "register": "Neutral",
                "grammar_patterns": [{"preposition": None, "case": "Nominativ"}],
                "example_sentences": [],
            }
        ],
    }
    response = client.post("/words/", json=payload)
    assert response.status_code == 422


def test_update_word_replaces_senses(client, valid_word_payload, two_senses_payload):
    """
    Ensure that sending senses in PUT replaces the existing sense list entirely.
    """
    # Create with 1 sense
    response = client.post("/words/", json=valid_word_payload)
    word_id = response.json()["id"]
    assert len(response.json()["senses"]) == 1

    # Update with 2 senses
    update_payload = {"senses": two_senses_payload["senses"]}
    response = client.put(f"/words/{word_id}", json=update_payload)
    assert response.status_code == 200
    assert len(response.json()["senses"]) == 2


def test_update_word_without_senses_preserves_existing(client, valid_word_payload):
    """
    Ensure that omitting senses from PUT leaves existing senses unchanged.
    """
    # Create with 1 sense
    response = client.post("/words/", json=valid_word_payload)
    word_id = response.json()["id"]

    # Update only a scalar field — no senses key
    response = client.put(f"/words/{word_id}", json={"translation": "Extra charge"})
    assert response.status_code == 200
    data = response.json()
    assert data["translation"] == "Extra charge"
    assert len(data["senses"]) == 1


def test_create_word_duplicate_returns_409(client, valid_word_payload):
    """
    Ensure a second POST with the same word value returns HTTP 409.
    """
    client.post("/words/", json=valid_word_payload)
    response = client.post("/words/", json=valid_word_payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "A word with this spelling already exists."


def test_create_word_with_provided_review_state(client, valid_word_payload):
    """
    Ensure a sense created with an explicit difficulty_level/last_reviewed_at
    (e.g. restored from a data import) persists those values instead of the
    default Medium/None.
    """
    payload = {**valid_word_payload}
    payload["senses"] = [
        {
            **valid_word_payload["senses"][0],
            "difficulty_level": "Hard",
            "last_reviewed_at": "2026-01-15T10:00:00Z",
        }
    ]
    response = client.post("/words/", json=payload)
    assert response.status_code == 200
    sense = response.json()["senses"][0]
    assert sense["difficulty_level"] == "Hard"
    assert sense["last_reviewed_at"] is not None


def test_create_word_without_review_state_defaults(client, valid_word_payload):
    """
    Ensure omitting difficulty_level/last_reviewed_at still defaults to
    Medium/None, preserving existing behavior for the normal Add Word flow.
    """
    response = client.post("/words/", json=valid_word_payload)
    assert response.status_code == 200
    sense = response.json()["senses"][0]
    assert sense["difficulty_level"] == "Medium"
    assert sense["last_reviewed_at"] is None


def test_create_word_case_sensitive_duplicate(client, valid_word_payload):
    """
    Ensure that words differing only in capitalisation are treated as distinct entries.

    The UNIQUE (word) constraint is case-sensitive, reflecting German orthographic
    convention where e.g. "laufen" (verb) and "Laufen" (nominalised noun) coexist.
    """
    lower_payload = {**valid_word_payload, "word": "laufen"}
    upper_payload = {**valid_word_payload, "word": "Laufen"}

    response_lower = client.post("/words/", json=lower_payload)
    response_upper = client.post("/words/", json=upper_payload)

    assert response_lower.status_code == 200
    assert response_upper.status_code == 200
