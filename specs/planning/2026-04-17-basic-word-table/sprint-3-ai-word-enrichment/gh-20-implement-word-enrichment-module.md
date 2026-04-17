# gh-20: Implement Word Enrichment Module

**GitHub Issue:** #20
**Notion Sprint:** _See issue body for Notion sprint URL_

---

## Technical Scope

**In scope:**
- New `enrichment` package at `backend/src/enrichment/` (sibling to `backend/src/backend/`, not inside it)
- Pydantic input/output schemas for the LLM boundary
- A single public function `get_word_enrichment(word: str) -> WordBase`
- Google Gemini Flash as the LLM backend (`google-genai` package)
- Unit tests with mocked LLM client

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
enrichment.service            ← public API; orchestrates the flow
  │  1. validates GermanWordInput
  │  2. builds prompt
  ▼
enrichment.client             ← thin Gemini Flash wrapper
  │  POST to Gemini API; returns raw JSON string
  ▼
enrichment.schemas            ← parse raw JSON into EnrichmentResponse (Pydantic)
  │  map fields onto WordBase
  ▼
WordBase                      ← existing schema: backend/src/backend/schemas.py
  │  returned to caller
  ▼
```

The `enrichment` package imports `WordBase` from `backend.schemas` but is otherwise self-contained. It does not import from `backend.main`, `backend.models`, or `backend.database`.

---

## Tech Stack

| Package      | Version  | Justification                                                        |
|--------------|----------|----------------------------------------------------------------------|
| `google-genai` | `>=1.0` | Official Google Gemini SDK; free tier; supports structured JSON output |

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                               |
|-----------------------------------------------|--------|-----------------------------------------------------------|
| `backend/src/enrichment/__init__.py`          | Create | Re-exports `get_word_enrichment` as the package's public API |
| `backend/src/enrichment/schemas.py`           | Create | `GermanWordInput` and `EnrichmentResponse` Pydantic types |
| `backend/src/enrichment/prompts.py`           | Create | Prompt template that instructs Gemini to return JSON matching `WordBase` |
| `backend/src/enrichment/client.py`            | Create | Gemini Flash client; reads `GEMINI_API_KEY` from env      |
| `backend/src/enrichment/service.py`           | Create | `get_word_enrichment()` — validation, prompt, parse, return |
| `backend/src/backend/schemas.py`              | Read   | Existing `WordBase`; reused unchanged as the return type  |
| `backend/pyproject.toml`                      | Modify | Add `google-genai` dependency                             |
| `backend/tests/enrichment/test_enrichment.py` | Create | Unit tests with mocked Gemini client                      |

### Key Functions

```python
# enrichment/service.py

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
        EnrichmentError: If the Gemini call fails or returns unparseable JSON.
    """
```

```python
# enrichment/client.py

def call_gemini(prompt: str) -> str:
    """
    Send a prompt to Gemini Flash and return the raw text response.

    Args:
        prompt: Fully-formed prompt string.

    Returns:
        Raw text response from the model (expected to be a JSON string).

    Raises:
        EnrichmentError: On API errors or empty responses.
    """
```

### Data Models / Schemas

```python
# enrichment/schemas.py

class GermanWordInput(BaseModel):
    word: str = Field(..., min_length=1, description="A German word to enrich")

class EnrichmentResponse(BaseModel):
    """Mirrors WordBase fields; parsed directly from Gemini's JSON output."""
    word: str
    translation: str
    gender: Optional[str] = "none"           # der | die | das | none
    category: Optional[str] = "noun"         # noun | verb | adjective | adverb | pronoun
    word_nominative: Optional[str] = None
    word_genitive: Optional[str] = None
    word_plural: Optional[str] = None
    prepositions: Optional[str] = None       # comma-separated
    example_sentences: Optional[str] = None  # comma-separated
    idiomatic_usages: Optional[str] = None   # comma-separated
```

`EnrichmentResponse` is then mapped field-by-field to `WordBase` (same fields, same types — direct `**response.model_dump()` works).

### Prompt Design

The prompt in `prompts.py` must:
1. Instruct the model to respond **only** with a JSON object (no prose)
2. Define each field with its German grammar meaning and allowed values
3. Use the `word` input in the prompt body

```python
# enrichment/prompts.py

ENRICHMENT_PROMPT_TEMPLATE = """
You are a German linguistics expert. Given a German word, return a JSON object
with the following fields (use null for unknown fields):

{{
  "word": "{word}",
  "translation": "<English translation>",
  "gender": "<der | die | das | none>",
  "category": "<noun | verb | adjective | adverb | pronoun>",
  "word_nominative": "<nominative singular form or null>",
  "word_genitive": "<genitive singular form or null>",
  "word_plural": "<plural form or null>",
  "prepositions": "<comma-separated prepositions commonly used with this word, or null>",
  "example_sentences": "<two comma-separated German example sentences, or null>",
  "idiomatic_usages": "<comma-separated idiomatic expressions, or null>"
}}

Respond with only the JSON object. No explanations.

Word: {word}
"""
```

---

## Testing Strategy

- **Unit tests** (mock `enrichment.client.call_gemini`):
  - Valid noun (`"Hund"`) → returns `WordBase` with `gender="der"`, `category="noun"`
  - Valid verb (`"laufen"`) → returns `WordBase` with `gender="none"`, `category="verb"`
  - Empty string → raises `ValidationError` before any LLM call
  - LLM returns malformed JSON → raises `EnrichmentError`
  - LLM returns JSON missing required fields (`word`, `translation`) → raises `ValidationError`

- **Integration test** (optional, gated by `GEMINI_API_KEY` env var):
  - Live call with `"Hund"` → response parses cleanly into `WordBase`

- **No mocking of Pydantic or `WordBase`** — test the full parse chain end-to-end.

---

## Open Questions / Risks

- [ ] `GEMINI_API_KEY` must be added to `.env` and to Docker Compose env config — confirm where to document this. — @Volscente
- [ ] Gemini free tier rate limits: 15 RPM / 1M TPD on Flash. Acceptable for manual enrichment; not for bulk. — note in README if bulk use is planned.
- [ ] Comma-separated storage for `prepositions`, `example_sentences`, `idiomatic_usages` is the existing convention. If this becomes JSON later, that is a separate schema migration task.
