"""
Pydantic models for the FastAPI request data validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .models import CategoryEnum, GenderEnum


class WordBase(BaseModel):
    """
    Base word model for Data Transfer Objects (DTO) approach.
    """

    word: str
    gender: Optional[GenderEnum] = GenderEnum.none
    word_nominative: Optional[str] = None
    word_genitive: Optional[str] = None
    word_plural: Optional[str] = None
    translation: str
    category: Optional[CategoryEnum] = CategoryEnum.noun
    prepositions: Optional[str] = None
    example_sentences: Optional[str] = None
    idiomatic_usages: Optional[str] = None


class WordCreate(WordBase):
    """
    Input model: data used to create a word.
    """

    pass


class WordRead(WordBase):
    """
    Output model: data used to retrieve a word.
    """

    id: int
    created_at: datetime

    # Tells Pydantic to read SQLAlchemy model attributes
    model_config = ConfigDict(from_attributes=True)
