"""
Create SQLAlchemy ORM models for the database Data Schema.
"""

import enum

from sqlalchemy import Column, DateTime, Enum, Integer, String, func
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


class Word(Base):
    """
    Words table with every useful information for each word.
    """

    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)

    # Nominative Case
    gender = Column(Enum(GenderEnum), nullable=False)
    word_nominative = Column(String, nullable=False, index=True)

    # Genitive Case
    word_genitive = Column(String, nullable=True)

    # Plural Case
    word_plural = Column(String, nullable=True)

    translation = Column(String, nullable=False)
    example_sentence = Column(String, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
