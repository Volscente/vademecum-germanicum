"""
Pydantic models for the FastAPI request data validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import (
    CaseEnum,
    CategoryEnum,
    DifficultyLevelEnum,
    GenderEnum,
    RegisterEnum,
    ResourceCategoryEnum,
    ResourceTypeEnum,
)


class UserCreate(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    id: int
    username: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GrammarPatternCreate(BaseModel):
    preposition: Optional[str] = None
    case: CaseEnum


class GrammarPatternRead(GrammarPatternCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ExampleSentenceCreate(BaseModel):
    german: str
    english: str


class ExampleSentenceRead(ExampleSentenceCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SenseCreate(BaseModel):
    meaning_summary: str
    register: RegisterEnum
    difficulty_level: Optional[DifficultyLevelEnum] = None
    last_reviewed_at: Optional[datetime] = None
    grammar_patterns: list[GrammarPatternCreate] = Field(min_length=1)
    example_sentences: list[ExampleSentenceCreate] = Field(min_length=1)


class SenseRead(BaseModel):
    id: int
    meaning_summary: str
    register: RegisterEnum
    difficulty_level: Optional[DifficultyLevelEnum] = None
    last_reviewed_at: Optional[datetime] = None
    grammar_patterns: list[GrammarPatternRead]
    example_sentences: list[ExampleSentenceRead]

    model_config = ConfigDict(from_attributes=True)


class SenseReviewUpdate(BaseModel):
    difficulty_level: DifficultyLevelEnum


class SenseWithWordRead(SenseRead):
    word: str
    translation: str
    gender: Optional[GenderEnum] = None
    category: Optional[CategoryEnum] = None
    word_plural: Optional[str] = None
    auxiliary_verb: Optional[str] = None
    principal_forms: Optional[list[str]] = None

    model_config = ConfigDict(from_attributes=True)


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
    auxiliary_verb: Optional[str] = None
    principal_forms: Optional[list[str]] = None


class WordCreate(WordBase):
    """
    Input model: data used to create a word.
    """

    senses: list[SenseCreate] = Field(min_length=1)


class WordRead(WordBase):
    """
    Output model: data used to retrieve a word.
    """

    id: int
    created_at: datetime
    senses: list[SenseRead]

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
    senses: Optional[list[SenseCreate]] = None


class ResourceBase(BaseModel):
    """
    Base resource model for Data Transfer Objects (DTO) approach.
    """

    name: str
    resource_type: ResourceTypeEnum
    url: str
    description: Optional[str] = None
    category: ResourceCategoryEnum


class ResourceCreate(ResourceBase):
    """
    Input model: data used to create a resource.
    """


class ResourceRead(ResourceBase):
    """
    Output model: data used to retrieve a resource.
    """

    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResourceUpdate(BaseModel):
    """
    Update model: data used to edit a resource.
    """

    name: Optional[str] = None
    resource_type: Optional[ResourceTypeEnum] = None
    url: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ResourceCategoryEnum] = None


class TopicBase(BaseModel):
    """
    Base topic model for Data Transfer Objects (DTO) approach.
    """

    label: str


class TopicCreate(TopicBase):
    """
    Input model: data used to create a topic.
    """


class TopicRead(TopicBase):
    """
    Output model: data used to retrieve a topic.
    """

    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicUpdate(BaseModel):
    """
    Update model: data used to edit a topic.
    """

    label: Optional[str] = None
