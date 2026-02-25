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
    }
