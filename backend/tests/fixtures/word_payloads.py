"""
Word Fixtures.
"""

import pytest


@pytest.fixture
def valid_word_payload():
    """
    Test word object.
    """
    return {
        "word": "Zuschlag",
        "gender": "der",
        "word_nominative": "Zuschlag",
        "translation": "Surcharge",
        "category": "noun",
        "senses": [
            {
                "meaning_summary": "Surcharge",
                "register": "Neutral",
                "grammar_patterns": [{"preposition": None, "case": "Nominativ"}],
                "example_sentences": [
                    {
                        "german": "Der Zuschlag beträgt 10 Euro.",
                        "english": "The surcharge is 10 euros.",
                    }
                ],
            }
        ],
    }


@pytest.fixture
def two_senses_payload():
    """
    Test word object with two senses.
    """
    return {
        "word": "abdrehen",
        "gender": "none",
        "translation": "to switch off / to turn away",
        "category": "verb",
        "senses": [
            {
                "meaning_summary": "To switch off (a device)",
                "register": "Neutral",
                "grammar_patterns": [{"preposition": None, "case": "Akkusativ"}],
                "example_sentences": [
                    {
                        "german": "Dreh das Licht ab.",
                        "english": "Switch off the light.",
                    }
                ],
            },
            {
                "meaning_summary": "To turn away (physically)",
                "register": "Colloquial",
                "grammar_patterns": [{"preposition": "von", "case": "Dativ"}],
                "example_sentences": [
                    {
                        "german": "Er drehte sich ab.",
                        "english": "He turned away.",
                    }
                ],
            },
        ],
    }
