"""
Word enrichment via LLM using PydanticAI with native Google provider.
"""

import os

from fastapi import HTTPException
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from .models import CategoryEnum, GenderEnum


class WordEnrichment(BaseModel):
    """Structured LLM output for word enrichment.

    A strict subset of WordCreate fields — everything except 'word' itself.
    Used as PydanticAI's output_type to enforce validated structured output.
    """

    gender: GenderEnum = Field(description="German article: der, die, das, or none")
    word_nominative: str | None = Field(
        default=None, description="Nominative case form"
    )
    word_genitive: str | None = Field(default=None, description="Genitive case form")
    word_plural: str | None = Field(default=None, description="Plural form")
    translation: str = Field(description="English translation")
    category: CategoryEnum = Field(
        description="Word category: noun, verb, adjective, adverb, pronoun"
    )
    prepositions: str | None = Field(
        default=None, description="Common prepositions used with the word"
    )
    example_sentences: str | None = Field(
        default=None, description="Example sentences in German"
    )
    idiomatic_usages: str | None = Field(
        default=None, description="Idiomatic expressions using the word"
    )


SYSTEM_PROMPT = """\
You are a German language expert. Given a German word, provide accurate metadata.

Rules:
- gender: "der" for masculine, "die" for feminine, "das" for neuter nouns. \
"none" for verbs, adjectives, adverbs, pronouns.
- word_nominative: The nominative case form (typically same as the word for nouns).
- word_genitive: The genitive case form (e.g. "des Zuschlags"). null if not applicable.
- word_plural: The plural form (e.g. "Zuschläge"). null if no plural exists.
- translation: English translation.
- category: One of "noun", "verb", "adjective", "adverb", "pronoun".
- prepositions: Common prepositions used with this word, if any.
- example_sentences: One or two example sentences in German.
- idiomatic_usages: Common idiomatic expressions, if any.

Be precise with German grammar. Return only factual linguistic information."""


async def enrich_word(word: str) -> WordEnrichment:
    """Enrich a German word with metadata using an LLM.

    Instantiates a PydanticAI agent with the GoogleModel provider,
    sends the word as a prompt, and returns the validated structured output.

    Args:
        word: The German word to enrich (e.g. "Zuschlag").

    Returns:
        A WordEnrichment instance with gender, translation, category,
        and other metadata fields populated by the LLM.

    Raises:
        HTTPException (422): If the LLM returns invalid or unparseable output.
        HTTPException (422): If the LLM provider is unreachable or returns an error.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("LLM_MODEL", "gemini-2.0-flash")

    model = GoogleModel(model_name, provider=GoogleProvider(api_key=api_key))
    agent = Agent(model, output_type=WordEnrichment, system_prompt=SYSTEM_PROMPT)

    try:
        result = await agent.run(f"Enrich the German word: {word}")
        return result.output
    except Exception as e:
        raise HTTPException(
            status_code=422, detail=f"Enrichment failed: {e}"
        ) from e
