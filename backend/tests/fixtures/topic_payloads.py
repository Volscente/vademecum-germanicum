"""
Topic Fixtures.
"""

import pytest


@pytest.fixture
def valid_topic_payload():
    """
    Test topic object.
    """
    return {"label": "Krankenkassenreform 2026"}


@pytest.fixture
def second_topic_payload():
    """
    A second, distinct test topic object.
    """
    return {"label": "Bundestagswahl"}
