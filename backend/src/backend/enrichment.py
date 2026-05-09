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
from .schemas import SenseCreate


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
    translation: str = Field(description="Short English translation for table display")
    category: CategoryEnum = Field(
        description="Word category: noun, verb, adjective, adverb, pronoun"
    )
    auxiliary_verb: str | None = Field(
        default=None, description="haben or sein (verbs only)"
    )
    principal_forms: list[str] | None = Field(
        default=None,
        description="[Infinitiv, Präteritum 3sg, Partizip II] (verbs only)",
    )
    senses: list[SenseCreate] = Field(
        min_length=1,
        description="Ordered list of discrete meaning blocks for this word",
    )


SYSTEM_PROMPT = """\
You are a German language expert. Given a German word, provide accurate metadata \
in the structured format described below.

Top-level fields:
- gender: "der" for masculine, "die" for feminine, "das" for neuter nouns. \
"none" for verbs, adjectives, adverbs, pronouns.
- word_nominative: The nominative case form (typically same as the word for nouns). \
null if not applicable.
- word_genitive: The genitive case form (e.g. "des Zuschlags"). null if not applicable.
- word_plural: The plural form (e.g. "Zuschläge"). null if no plural exists.
- translation: A short English translation used for table display (1–5 words).
- category: One of "noun", "verb", "adjective", "adverb", "pronoun".
- auxiliary_verb: "haben" or "sein" for verbs only. null for all other categories.
- principal_forms: A list of exactly three strings [Infinitiv, Präteritum 3sg, \
Partizip II] for verbs only (e.g. ["warten", "wartete", "gewartet"]). \
null for all other categories.

Senses:
- senses: A non-empty list of Sense objects. Each Sense represents one discrete \
meaning of the word. Provide one Sense per distinct meaning.

Each Sense must contain:
- meaning_summary: A concise English description of this specific meaning (1–2 sentences).
- register: The social/stylistic register of this meaning. \
Must be exactly one of: "Formal", "Colloquial", "Neutral", "Technical".
- grammar_patterns: A non-empty list of grammar pattern objects. \
NEVER return an empty list — this is invalid.
  Each grammar pattern must contain:
  - preposition: The preposition required by this sense (e.g. "auf", "für"). \
Use null (not the string "none") when no preposition is required.
  - case: The grammatical case governed by this sense. \
Must be exactly one of: "Nominativ", "Akkusativ", "Dativ", "Genitiv".
- example_sentences: A non-empty list of example sentence objects. \
NEVER return an empty list — this is invalid. Provide at least one example.
  Each example sentence must contain:
  - german: A natural German sentence using the word in this sense.
  - english: The English translation of the German sentence.

Be precise with German grammar. Return only factual linguistic information."""


async def enrich_word(word: str) -> WordEnrichment:
    """Enrich a German word with sense-based metadata using an LLM.

    Instantiates a PydanticAI agent with GoogleModel, sends the word as a
    prompt, and returns the validated structured output. Behaviour is unchanged
    from the previous implementation; only the shape of the returned
    WordEnrichment differs (now includes a senses list).

    Args:
        word: The German word to enrich (e.g. "warten").

    Returns:
        A WordEnrichment instance with gender, translation, category,
        optional verb morphology fields, and a non-empty senses list,
        each sense carrying grammar_patterns and example_sentences.

    Raises:
        HTTPException (422): If the LLM returns output that fails Pydantic
            validation (e.g. empty grammar_patterns or example_sentences).
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
