"""
Pydantic models for the FastAPI request data validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .models import CategoryEnum, GenderEnum


class WordBase(BaseModel):
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
    pass  # Data required to create a word


class WordRead(WordBase):
    id: int
    created_at: datetime

    # Tells Pydantic to read SQLAlchemy model attributes
    model_config = ConfigDict(from_attributes=True)
