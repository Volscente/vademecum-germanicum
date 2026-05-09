"""
SQLAlchemy ORM models for the database Data Schema.
"""

import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import declarative_base, relationship

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


class CaseEnum(str, enum.Enum):
    """
    German grammatical cases.
    """

    nominativ = "Nominativ"
    akkusativ = "Akkusativ"
    dativ = "Dativ"
    genitiv = "Genitiv"


class RegisterEnum(str, enum.Enum):
    """
    Social/stylistic register of a word sense.
    """

    formal = "Formal"
    colloquial = "Colloquial"
    neutral = "Neutral"
    technical = "Technical"


class ExampleSentence(Base):
    """
    A German example sentence with its English translation, belonging to a Sense.
    """

    __tablename__ = "example_sentences"

    id = Column(Integer, primary_key=True, index=True)
    sense_id = Column(Integer, ForeignKey("senses.id"), nullable=False)
    german = Column(String, nullable=False)
    english = Column(String, nullable=False)

    sense = relationship("Sense", back_populates="example_sentences")


class GrammarPattern(Base):
    """
    A (preposition, grammatical case) pair governing a Sense.
    preposition is nullable — NULL means no preposition is required.
    """

    __tablename__ = "grammar_patterns"

    id = Column(Integer, primary_key=True, index=True)
    sense_id = Column(Integer, ForeignKey("senses.id"), nullable=False)
    preposition = Column(String, nullable=True)
    case = Column(Enum(CaseEnum), nullable=False)

    sense = relationship("Sense", back_populates="grammar_patterns")


class Sense(Base):
    """
    A discrete meaning block within a Word entry.
    Each Sense has its own register, grammar patterns, and example sentences.
    """

    __tablename__ = "senses"

    id = Column(Integer, primary_key=True, index=True)
    word_id = Column(Integer, ForeignKey("words.id"), nullable=False)
    meaning_summary = Column(String, nullable=False)
    register = Column(Enum(RegisterEnum), nullable=False)

    word = relationship("Word", back_populates="senses")
    grammar_patterns = relationship(
        "GrammarPattern", back_populates="sense", cascade="all, delete-orphan"
    )
    example_sentences = relationship(
        "ExampleSentence", back_populates="sense", cascade="all, delete-orphan"
    )


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

    # Quick-look translation (retained for table display and search)
    translation = Column(String, nullable=False)
    category = Column(Enum(CategoryEnum), nullable=True)

    # Verb morphology
    auxiliary_verb = Column(String, nullable=True)
    principal_forms = Column(JSON, nullable=True)  # [infinitiv, präteritum, partizip_ii]

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    senses = relationship("Sense", back_populates="word", cascade="all, delete-orphan")
