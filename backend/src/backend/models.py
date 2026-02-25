"""
SQLAlchemy ORM models for the database Data Schema.
"""

import enum

from sqlalchemy import Column, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class GenderEnum(str, enum.Enum):
    """
    German genders.
    """

    der = "der"
    die = "die"
    das = "das"
    none = "none"


class CategoryEnum(str, enum.Enum):
    """
    Word categories.
    """

    noun = "noun"
    verb = "verb"
    adjective = "adjective"
    adverb = "adverb"
    pronoun = "pronoun"


class Word(Base):
    """
    Words table with every useful information for each word.
    """

    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)

    # Basic word
    word = Column(String, nullable=False, index=True)

    # Nominative Case
    gender = Column(Enum(GenderEnum), nullable=True)
    word_nominative = Column(String, nullable=True)

    # Genitive Case
    word_genitive = Column(String, nullable=True)

    # Plural Case
    word_plural = Column(String, nullable=True)

    # Additional information
    translation = Column(String, nullable=False)
    category = Column(Enum(CategoryEnum), nullable=True)

    # Lists
    prepositions = Column(Text, nullable=True)
    example_sentences = Column(Text, nullable=True)
    idiomatic_usages = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
