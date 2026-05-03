"""
Tests for the word enrichment endpoint.
"""

from unittest.mock import AsyncMock, patch

import pytest
from backend.enrichment import WordEnrichment
from fastapi import HTTPException


@pytest.fixture
def mock_enrichment_result():
    """A controlled WordEnrichment response for mocking."""
    return WordEnrichment(
        gender="der",
        word_nominative="Zuschlag",
        word_genitive="des Zuschlags",
        word_plural="Zuschläge",
        translation="Surcharge",
        category="noun",
        prepositions=None,
        example_sentences="Der Zuschlag beträgt fünf Euro.",
        idiomatic_usages=None,
    )


def test_enrich_word_success(client, mock_enrichment_result):
    """Ensure POST /words/enrich returns enrichment fields for a valid word."""
    with patch(
        "backend.main.enrich_word",
        new_callable=AsyncMock,
        return_value=mock_enrichment_result,
    ):
        response = client.post("/words/enrich", json={"word": "Zuschlag"})

    assert response.status_code == 200
    data = response.json()
    assert data["translation"] == "Surcharge"
    assert data["gender"] == "der"
    assert data["category"] == "noun"
    assert data["word_genitive"] == "des Zuschlags"
    assert data["word_plural"] == "Zuschläge"


def test_enrich_word_missing_field(client):
    """Ensure POST /words/enrich with missing word field returns 422."""
    response = client.post("/words/enrich", json={})
    assert response.status_code == 422


def test_enrich_word_empty_string(client):
    """Ensure POST /words/enrich with empty string returns 422."""
    response = client.post("/words/enrich", json={"word": ""})
    assert response.status_code == 422


def test_enrich_word_agent_error(client):
    """Ensure POST /words/enrich returns 422 when the agent raises an exception."""
    with patch(
        "backend.main.enrich_word",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=422, detail="Enrichment failed: LLM provider unreachable"
        ),
    ):
        response = client.post("/words/enrich", json={"word": "Zuschlag"})

    assert response.status_code == 422
    assert "Enrichment failed" in response.json()["detail"]
