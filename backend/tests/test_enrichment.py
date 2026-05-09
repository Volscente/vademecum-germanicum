"""
Tests for the word enrichment endpoint.
"""

from unittest.mock import AsyncMock, patch

import pytest
from backend.enrichment import WordEnrichment
from backend.models import CategoryEnum, CaseEnum, GenderEnum, RegisterEnum
from backend.schemas import ExampleSentenceCreate, GrammarPatternCreate, SenseCreate
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
        auxiliary_verb=None,
        principal_forms=None,
        senses=[
            SenseCreate(
                meaning_summary="An additional charge added on top of a base price",
                register=RegisterEnum.neutral,
                grammar_patterns=[
                    GrammarPatternCreate(preposition=None, case=CaseEnum.nominativ)
                ],
                example_sentences=[
                    ExampleSentenceCreate(
                        german="Der Zuschlag beträgt fünf Euro.",
                        english="The surcharge is five euros.",
                    )
                ],
            )
        ],
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
    assert isinstance(data["senses"], list)
    assert len(data["senses"]) >= 1
    assert data["senses"][0]["meaning_summary"]
    assert isinstance(data["senses"][0]["grammar_patterns"], list)
    assert len(data["senses"][0]["grammar_patterns"]) >= 1
    assert isinstance(data["senses"][0]["example_sentences"], list)
    assert len(data["senses"][0]["example_sentences"]) >= 1


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


def test_enrich_endpoint_serialises_enums_as_strings(client):
    """Verify that gender, category, register, and case are serialised as strings.

    The frontend Zod schema expects plain strings ("der", "noun", "Neutral",
    "Akkusativ"), not Python enum reprs. A mismatch causes setValue to silently fail.
    """
    mock_result = WordEnrichment(
        gender=GenderEnum.der,
        category=CategoryEnum.noun,
        translation="house",
        word_nominative="Haus",
        word_genitive="des Hauses",
        word_plural="Häuser",
        auxiliary_verb=None,
        principal_forms=None,
        senses=[
            SenseCreate(
                meaning_summary="A building used as a home",
                register=RegisterEnum.neutral,
                grammar_patterns=[
                    GrammarPatternCreate(preposition=None, case=CaseEnum.nominativ)
                ],
                example_sentences=[
                    ExampleSentenceCreate(
                        german="Das Haus ist groß.",
                        english="The house is big.",
                    )
                ],
            )
        ],
    )

    with patch(
        "backend.main.enrich_word",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        response = client.post("/words/enrich", json={"word": "Haus"})

    assert response.status_code == 200
    body = response.json()
    assert body["gender"] == "der"        # string, not "GenderEnum.der"
    assert body["category"] == "noun"     # string, not "CategoryEnum.noun"
    assert body["translation"] == "house"
    assert body["senses"][0]["register"] == "Neutral"
    assert body["senses"][0]["grammar_patterns"][0]["case"] == "Nominativ"


def test_enrich_word_returns_sense_array(client):
    """Ensure the enrichment response includes a senses array with nested structure."""
    mock_result = WordEnrichment(
        gender=GenderEnum.none,
        category=CategoryEnum.verb,
        translation="to wait",
        word_nominative=None,
        word_genitive=None,
        word_plural=None,
        auxiliary_verb="haben",
        principal_forms=["warten", "wartete", "gewartet"],
        senses=[
            SenseCreate(
                meaning_summary="To remain in a place or state until something happens",
                register=RegisterEnum.neutral,
                grammar_patterns=[
                    GrammarPatternCreate(preposition="auf", case=CaseEnum.akkusativ)
                ],
                example_sentences=[
                    ExampleSentenceCreate(
                        german="Ich warte auf den Bus.",
                        english="I am waiting for the bus.",
                    )
                ],
            )
        ],
    )

    with patch(
        "backend.main.enrich_word",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        response = client.post("/words/enrich", json={"word": "warten"})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["senses"], list)
    assert len(body["senses"]) == 1
    sense = body["senses"][0]
    assert sense["meaning_summary"]
    assert sense["register"] == "Neutral"
    assert sense["grammar_patterns"][0]["preposition"] == "auf"
    assert sense["grammar_patterns"][0]["case"] == "Akkusativ"
    assert sense["example_sentences"][0]["german"] == "Ich warte auf den Bus."
    assert sense["example_sentences"][0]["english"] == "I am waiting for the bus."
    assert body["auxiliary_verb"] == "haben"
    assert body["principal_forms"] == ["warten", "wartete", "gewartet"]
