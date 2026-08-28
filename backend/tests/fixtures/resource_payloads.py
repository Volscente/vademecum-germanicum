"""
Resource Fixtures.
"""

import pytest


@pytest.fixture
def valid_resource_payload():
    """
    Test resource object.
    """
    return {
        "name": "Tagesschau",
        "resource_type": "newspaper",
        "url": "https://www.tagesschau.de",
        "description": "German news",
        "category": "news",
    }


@pytest.fixture
def second_resource_payload():
    """
    A second, distinct test resource object.
    """
    return {
        "name": "Easy German",
        "resource_type": "youtube",
        "url": "https://www.youtube.com/@easygerman",
        "description": "Street interviews in German with subtitles",
        "category": "culture_lifestyle",
    }
