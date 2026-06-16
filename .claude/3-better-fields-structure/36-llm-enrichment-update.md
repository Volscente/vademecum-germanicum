# #36: LLM Enrichment Update

**GitHub Issue:** [#36 — LLM Enrichment Update](https://github.com/Volscente/vademecum-germanicum/issues/36)
**GitHub Milestone:** [3-better-fields-structure](https://github.com/Volscente/vademecum-germanicum/milestones)
**Notion page:** [3 — Better Fields Structure](https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc)

---

## Technical Scope

**In scope:**

- `backend/src/backend/enrichment.py` — replace the flat `WordEnrichment` fields (`prepositions`, `example_sentences`, `idiomatic_usages`) with a `senses: list[SenseCreate]` field; add `auxiliary_verb` and `principal_forms`; rewrite `SYSTEM_PROMPT` to instruct Gemini to produce the new nested structure
- `backend/tests/test_enrichment.py` — update all existing tests to use the new `WordEnrichment` shape; add one new test verifying the `senses` array structure in the HTTP response

**Out of scope:**

- Changes to `models.py`, `schemas.py`, or any ORM model (delivered in TASK-1 / issue #35)
- Frontend TypeScript interface or Zod schema updates (TASK-3 / issue #37)
- LLM provider switch — still using Google Gemini via pydantic-ai

---

## Architecture

```txt
POST /words/enrich  (main.py)
          │  {"word": str}
          │
          ▼
    enrich_word(word: str) -> WordEnrichment     (enrichment.py)
    ┌──────────────────────────────────────────────────────────┐
    │  GoogleModel("gemini-2.0-flash")                         │
    │  Agent(model, output_type=WordEnrichment,                │
    │         system_prompt=SYSTEM_PROMPT)                     │
    │  → result.output  (validated WordEnrichment instance)    │
    └──────────────────────────────────────────────────────────┘
          │  WordEnrichment
          │   ├─ gender, translation, category, ...
          │   └─ senses: list[SenseCreate]   ← NEW
          │       ├─ meaning_summary, register
          │       ├─ grammar_patterns: list[GrammarPatternCreate]
          │       └─ example_sentences: list[ExampleSentenceCreate]
          ▼
    HTTP 200 JSON   (serialised by FastAPI)
```

### Why reuse `SenseCreate` / `GrammarPatternCreate` / `ExampleSentenceCreate` from `schemas.py`

PydanticAI uses the `output_type` model's field definitions to constrain the LLM's structured JSON output. Importing the already-validated schemas from `schemas.py` (which already carry `min_length=1` constraints on `grammar_patterns` and `example_sentences`) means the data-integrity rules are enforced at the PydanticAI output-parsing step — no duplicate validation needed. If the LLM violates `min_length`, PydanticAI raises and `enrich_word` converts it to HTTP 422 via the existing `except Exception` handler.

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                                         |
| --------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `backend/src/backend/enrichment.py`           | Edit   | Update `WordEnrichment` model; rewrite `SYSTEM_PROMPT`             |
| `backend/tests/test_enrichment.py`            | Edit   | Update all tests to new `WordEnrichment` shape; add sense array test |

---

### Key Functions

```python
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
        HTTPException (422): If the LLM provider is unreachable.
    """
```

---

### Data Models / Schemas

```python
# enrichment.py — updated WordEnrichment
# Imports SenseCreate from schemas.py to reuse min_length constraints.

from .schemas import SenseCreate

class WordEnrichment(BaseModel):
    gender: GenderEnum = Field(description="German article: der, die, das, or none")
    word_nominative: str | None = Field(default=None, description="Nominative form")
    word_genitive: str | None = Field(default=None, description="Genitive form")
    word_plural: str | None = Field(default=None, description="Plural form")
    translation: str = Field(description="Short English translation for table display")
    category: CategoryEnum = Field(description="noun, verb, adjective, adverb, or pronoun")
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
```

Reused from `schemas.py` (no changes needed):

```python
class SenseCreate(BaseModel):
    meaning_summary: str
    register: RegisterEnum              # Formal | Colloquial | Neutral | Technical
    grammar_patterns: list[GrammarPatternCreate] = Field(min_length=1)
    example_sentences: list[ExampleSentenceCreate] = Field(min_length=1)

class GrammarPatternCreate(BaseModel):
    preposition: Optional[str] = None   # None means "no preposition required"
    case: CaseEnum                      # Nominativ | Akkusativ | Dativ | Genitiv

class ExampleSentenceCreate(BaseModel):
    german: str
    english: str
```

`SYSTEM_PROMPT` must be rewritten to:

1. Describe the `senses` array and explain what a Sense is.
2. List valid `register` values: `Formal`, `Colloquial`, `Neutral`, `Technical`.
3. List valid `case` values: `Nominativ`, `Akkusativ`, `Dativ`, `Genitiv`.
4. Instruct that `preposition` is `null` when no preposition is required (not a string like "none").
5. Require at least one `grammar_patterns` entry and at least one `example_sentences` entry per Sense — explicitly state that empty arrays are not allowed.
6. Instruct to populate `auxiliary_verb` ("haben" or "sein") and `principal_forms` (3-element list) only for verbs; leave `null` otherwise.
7. Keep the existing rules for `gender`, `word_nominative`, `word_genitive`, `word_plural`, `translation`, `category`.

---

### Testing Strategy

**Unit tests** (`backend/tests/test_enrichment.py`):

- **Update `mock_enrichment_result` fixture** — construct `WordEnrichment` with a `senses` list containing at least one `SenseCreate` with one `GrammarPatternCreate` and one `ExampleSentenceCreate`; remove old flat fields (`prepositions`, `example_sentences`, `idiomatic_usages`).
- **Update `test_enrich_word_success`** — assert `data["senses"]` is a non-empty list; assert `data["senses"][0]["meaning_summary"]` is a non-empty string; assert `data["senses"][0]["grammar_patterns"]` is a non-empty list; assert `data["senses"][0]["example_sentences"]` is a non-empty list.
- **Update `test_enrich_endpoint_serialises_enums_as_strings`** — verify `data["senses"][0]["register"]` is a plain string (e.g. `"Neutral"`); verify `data["senses"][0]["grammar_patterns"][0]["case"]` is a plain string (e.g. `"Akkusativ"`).
- **Keep `test_enrich_word_missing_field`** — unchanged (still expects 422 on missing `word`).
- **Keep `test_enrich_word_empty_string`** — unchanged.
- **Keep `test_enrich_word_agent_error`** — unchanged (side_effect path does not depend on model shape).
- **Add `test_enrich_word_returns_sense_array`** — mock returns a `WordEnrichment` with one complete `SenseCreate`; assert HTTP 200 and that `response.json()["senses"]` has length ≥ 1 with expected nested keys.

**Integration test** (manual — requires `GEMINI_API_KEY`):

```bash
docker-compose run --rm --build backend uv run --package backend \
    python -c "
import asyncio
from backend.enrichment import enrich_word
result = asyncio.run(enrich_word('warten'))
print(result.model_dump_json(indent=2))
"
```

Verify: response contains `senses` list with ≥ 1 entry; each entry has non-empty `grammar_patterns` and `example_sentences`; `grammar_patterns[0].case` is a valid `CaseEnum` value.

**Edge cases:**

- LLM returns `grammar_patterns: []` for a Sense → PydanticAI validation fails on `min_length=1` → `except Exception` in `enrich_word` → HTTP 422 with `"Enrichment failed: ..."`.
- LLM returns `senses: []` → same path as above → HTTP 422.
- LLM omits `auxiliary_verb` for a verb → field defaults to `null`, which is valid; no error.

---

### Open Questions / Risks

- [x] **Prompt reliability:** Gemini may not consistently populate `grammar_patterns` and `example_sentences` on the first attempt. If tests show frequent empty-list violations, the system prompt should be strengthened with a negative example (i.e., show what an invalid response looks like). **Target:** verified during integration test after implementation. **Answer:** User test validation would discover if there are problems in the usability of the enriching function.
- [x] **Circular import risk:** `enrichment.py` currently only imports from `models.py`. Importing `SenseCreate` from `schemas.py` is safe as long as `schemas.py` does not import from `enrichment.py` (it does not). Confirm before merging. **Target:** compile-time check during implementation. **Answer**: Verify during the implementation phase through unit testing.
