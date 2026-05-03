"""
Pydantic models for the FastAPI request data validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

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

    # Tells Pydantic to read SQLAlchemy model attributes -> Required when converting DB objects into Pydantic
    model_config = ConfigDict(from_attributes=True)


class WordEnrichRequest(BaseModel):
    """Request body for the enrichment endpoint."""

    word: str = Field(min_length=1, description="The German word to enrich")


class WordUpdate(WordBase):
    """
    Update model: data used to edit a word.
    """

    word: Optional[str] = None
    translation: Optional[str] = None
