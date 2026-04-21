# gh-20: Implement Word Enrichment Module

**GitHub Issue:** #20
**Notion Sprint:** _See issue body for Notion sprint URL_

---

## Technical Scope

**In scope:**
- New `enrichment` package at `backend/src/enrichment/` (sibling to `backend/src/backend/`, not inside it)
- A `GermanWordInput` Pydantic schema for input validation at the service boundary
- A single public function `get_word_enrichment(word: str) -> WordBase`
- Google Gemini Flash as the LLM backend via PydanticAI
- Unit tests using PydanticAI's built-in `TestModel`

**Out of scope:**
- API endpoint to trigger enrichment (future sprint)
- Frontend integration
- Database schema changes
- Automatic enrichment on word creation
- Caching or retry logic

---

## Architecture

```text
Caller (script or future endpoint)
  │  get_word_enrichment("Hund")
  ▼
enrichment.service            ← public API; validates input, runs Agent
  │  1. validates GermanWordInput
  │  2. agent.run_sync(user_prompt)
  ▼
PydanticAI Agent (GeminiModel) ← handles Gemini call + structured output parsing
  │  result_type=WordBase; no manual JSON parsing needed
  ▼
WordBase                      ← existing schema: backend/src/backend/schemas.py
  │  returned to caller
  ▼
```

PydanticAI replaces the manual client + JSON-parse layer entirely. The `enrichment` package imports `WordBase` from `backend.schemas` but is otherwise self-contained. It does not import from `backend.main`, `backend.models`, or `backend.database`.

---

## Tech Stack

| Package             | Version  | Justification                                                                      |
|---------------------|----------|------------------------------------------------------------------------------------|
| `pydantic-ai[gemini]` | `>=0.1` | Structured LLM outputs directly into Pydantic models; native Gemini support; `TestModel` for unit tests without hitting the API |

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                               |
|-----------------------------------------------|--------|-----------------------------------------------------------|
| `backend/src/enrichment/__init__.py`          | Create | Re-exports `get_word_enrichment` as the package's public API |
| `backend/src/enrichment/schemas.py`           | Create | `GermanWordInput` for input validation at the service boundary |
| `backend/src/enrichment/prompts.py`           | Create | System prompt constant instructing Gemini to populate `WordBase` fields |
| `backend/src/enrichment/service.py`           | Create | PydanticAI Agent definition + `get_word_enrichment()` |
| `backend/src/backend/schemas.py`              | Read   | Existing `WordBase`; used as the Agent's `result_type` and the function's return type |
| `backend/pyproject.toml`                      | Modify | Add `pydantic-ai[gemini]` dependency                      |
| `backend/tests/enrichment/test_enrichment.py` | Create | Unit tests using PydanticAI's `TestModel`                 |

No `client.py` is needed — PydanticAI's Agent handles the LLM call and structured output parsing.

### Key Functions

```python
# enrichment/service.py

from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel
from backend.schemas import WordBase
from .schemas import GermanWordInput
from .prompts import SYSTEM_PROMPT

_agent = Agent(
    GeminiModel("gemini-1.5-flash"),
    result_type=WordBase,
    system_prompt=SYSTEM_PROMPT,
)

def get_word_enrichment(word: str) -> WordBase:
    """
    Query Gemini Flash to enrich a German word with grammatical and usage data.

    Args:
        word: A German word (noun, verb, adjective, etc.). Must be non-empty.

    Returns:
        WordBase populated with gender, declension forms, category, translation,
        and usage examples as returned by the LLM.

    Raises:
        ValidationError: If `word` is empty.
        EnrichmentError: If the Gemini call fails or returns output that cannot
                         be parsed into WordBase.
    """
    GermanWordInput(word=word)  # raises ValidationError if empty
    try:
        result = _agent.run_sync(f"Enrich the German word: {word}")
        return result.data
    except Exception as exc:
        raise EnrichmentError(f"Enrichment failed for '{word}'") from exc
```

### Data Models / Schemas

```python
# enrichment/schemas.py

class GermanWordInput(BaseModel):
    word: str = Field(..., min_length=1, description="A German word to enrich")
```

`WordBase` (from `backend.schemas`) is used directly as the Agent's `result_type`. PydanticAI guides the LLM to produce output that matches `WordBase`'s field types and constraints — including `GenderEnum` and `CategoryEnum` — without manual mapping.

`EnrichmentResponse` is not needed; the structured output layer is handled by PydanticAI.

### Prompt Design

The system prompt in `prompts.py` must:
1. Instruct the model to act as a German linguistics expert
2. Define each field with its German grammar meaning and allowed values
3. Rely on PydanticAI's structured output enforcement (no need to say "respond only with JSON")

```python
# enrichment/prompts.py

SYSTEM_PROMPT = """
You are a German linguistics expert. When given a German word, populate the
requested fields with accurate grammatical and usage data:

- word: the word as given
- translation: English translation
- gender: one of der | die | das | none (use none for non-nouns)
- category: one of noun | verb | adjective | adverb | pronoun
- word_nominative: nominative singular form, or null
- word_genitive: genitive singular form, or null
- word_plural: plural form, or null
- prepositions: comma-separated prepositions commonly used with this word, or null
- example_sentences: two comma-separated German example sentences, or null
- idiomatic_usages: comma-separated idiomatic expressions, or null

Use null for unknown or inapplicable fields.
"""
```

---

## Testing Strategy

- **Unit tests** (PydanticAI `TestModel` — no live API calls):
  - Valid noun (`"Hund"`) → returns a `WordBase` instance
  - Valid verb (`"laufen"`) → returns a `WordBase` instance
  - Empty string → raises `ValidationError` before Agent is invoked
  - Agent raises an exception → `get_word_enrichment` raises `EnrichmentError`

- **Integration test** (optional, gated by `GEMINI_API_KEY` env var):
  - Live call with `"Hund"` → response parses cleanly into `WordBase`

- **No mocking of Pydantic or `WordBase`** — test the full parse chain end-to-end.

```python
# backend/tests/enrichment/test_enrichment.py (sketch)

from pydantic_ai.models.test import TestModel
from enrichment.service import _agent, get_word_enrichment

def test_valid_word_returns_wordbase():
    with _agent.override(model=TestModel()):
        result = get_word_enrichment("Hund")
        assert isinstance(result, WordBase)

def test_empty_word_raises_validation_error():
    with pytest.raises(ValidationError):
        get_word_enrichment("")

def test_agent_failure_raises_enrichment_error():
    with _agent.override(model=TestModel(call_tools=[])):  # simulate failure
        with pytest.raises(EnrichmentError):
            get_word_enrichment("Hund")
```

---

## Open Questions / Risks

- [ ] `GEMINI_API_KEY` must be added to `.env` and to Docker Compose env config — confirm where to document this. — @Volscente
- [ ] Gemini free tier rate limits: 15 RPM / 1M TPD on Flash. Acceptable for manual enrichment; not for bulk. — note in README if bulk use is planned.
- [ ] Comma-separated storage for `prepositions`, `example_sentences`, `idiomatic_usages` is the existing convention. If this becomes JSON later, that is a separate schema migration task.
- [ ] PydanticAI's structured output relies on the model supporting function calling / JSON mode. Gemini Flash supports this; verify the specific model version used (`gemini-1.5-flash` vs `gemini-2.0-flash`) at implementation time.
