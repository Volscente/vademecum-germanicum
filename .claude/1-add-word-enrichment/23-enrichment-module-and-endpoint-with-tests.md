# #23: Enrichment Module and Endpoint with Tests

**GitHub Issue:** [#23 — Backend Enrichment API](https://github.com/Volscente/vademecum-germanicum/issues/23)
**GitHub Milestone:** [Milestone: add-word-enrichment](https://github.com/Volscente/vademecum-germanicum/milestone/3)
**Notion page:** [Add Word Enrichment](https://www.notion.so/1-Add-Word-Enrichment-3545cc6c0f0780c3a0d4e11f3aa47880)

---

## Technical Scope

**In scope:**

- `backend/src/backend/enrichment.py` — new module: `WordEnrichment` model, PydanticAI agent, `enrich_word()` function
- `backend/src/backend/schemas.py` — add `WordEnrichRequest` schema for request validation
- `backend/src/backend/main.py` — add `POST /words/enrich` route
- `backend/tests/test_enrichment.py` — unit tests (mocked LLM) and integration tests for the endpoint

**Out of scope:**

- Enrichment for existing (already-saved) words
- Batch enrichment
- Frontend changes (TASK-3)

---

## Architecture

```txt
POST /words/enrich  { "word": "Zuschlag" }
      │
      ▼
main.py: enrich_word_endpoint(request)
      │
      ▼
enrichment.py: enrich_word(word)
      │
      ├── Agent(model, output_type=WordEnrichment)
      │         │
      │         ▼
      │   GoogleProvider(api_key=GEMINI_API_KEY)
      │         │
      │         ▼
      │   GoogleModel(LLM_MODEL)
      │         │
      │         ▼
      │   Google AI Studio (Gemini Flash)
      │
      ▼
WordEnrichment (validated Pydantic model)
      │
      ▼
JSON response → frontend pre-fills form
```

### Why PydanticAI native Google provider instead of LiteLLM

The RFC specified LiteLLM for model-provider abstraction. However, PydanticAI natively supports Google Gemini via `GoogleModel` + `GoogleProvider`, as well as OpenAI, Anthropic, and other providers via their respective model classes. This makes LiteLLM redundant as an abstraction layer — PydanticAI itself provides the same capability. Using the native provider is simpler (no proxy server, no extra library in the call path) and avoids a known compatibility risk flagged in the RFC. LiteLLM remains installed as a dependency and can be used later if needed.

The `LLM_MODEL` env var stores the model name (e.g. `gemini-2.0-flash`). Swapping to a different provider would require changing the provider setup in `enrichment.py` — acceptable for a personal project with low churn.

---

## Tech Stack

No new packages required. `pydantic-ai` and `litellm` were added in TASK-1. `google-genai` is installed as a transitive dependency of `pydantic-ai`.

---

## Implementation Details

### Modules / Files

| File                                | Action | Description                                                  |
| ----------------------------------- | ------ | ------------------------------------------------------------ |
| `backend/src/backend/enrichment.py` | Create | `WordEnrichment` model, PydanticAI agent, `enrich_word()`    |
| `backend/src/backend/schemas.py`    | Modify | Add `WordEnrichRequest` schema                               |
| `backend/src/backend/main.py`       | Modify | Add `POST /words/enrich` route                               |
| `backend/tests/test_enrichment.py`  | Create | Unit tests (mocked agent) and integration tests for endpoint |

---

### Key Functions

```python
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
```

```python
@app.post("/words/enrich", response_model=WordEnrichment)
async def enrich_word_endpoint(
    request: WordEnrichRequest,
) -> WordEnrichment:
    """Enrich a German word via LLM and return structured metadata.

    Accepts a word string, delegates to the enrichment module,
    and returns validated field values for frontend form pre-fill.

    Args:
        request: Request body containing the word to enrich.

    Returns:
        WordEnrichment with populated metadata fields.

    Raises:
        HTTPException (422): If enrichment fails due to LLM or validation errors.
    """
```

---

### Data Models / Schemas

```python
class WordEnrichRequest(BaseModel):
    """Request body for the enrichment endpoint."""
    word: str = Field(description="The German word to enrich")


class WordEnrichment(BaseModel):
    """Structured LLM output for word enrichment.

    A strict subset of WordCreate fields — everything except 'word' itself.
    Used as PydanticAI's output_type to enforce validated structured output.
    """
    gender: GenderEnum = Field(description="German article: der, die, das, or none")
    word_nominative: str | None = Field(default=None, description="Nominative case form")
    word_genitive: str | None = Field(default=None, description="Genitive case form")
    word_plural: str | None = Field(default=None, description="Plural form")
    translation: str = Field(description="English translation")
    category: CategoryEnum = Field(description="Word category: noun, verb, adjective, adverb, pronoun")
    prepositions: str | None = Field(default=None, description="Common prepositions used with the word")
    example_sentences: str | None = Field(default=None, description="Example sentences in German")
    idiomatic_usages: str | None = Field(default=None, description="Idiomatic expressions using the word")
```

---

### Testing Strategy

**Unit tests** (`backend/tests/test_enrichment.py`):

- Mock the PydanticAI agent's `run` method to return a controlled `WordEnrichment` response
- Test `POST /words/enrich` with a valid word → 200 with correct enrichment fields
- Test `POST /words/enrich` with missing `word` field → 422 validation error
- Test `POST /words/enrich` when agent raises an exception → 422 with descriptive message

**Integration test** (via `TestClient`, mocked LLM):

```python
def test_enrich_word_success(client):
    response = client.post("/words/enrich", json={"word": "Zuschlag"})
    assert response.status_code == 200
    data = response.json()
    assert "translation" in data
    assert "gender" in data
    assert "category" in data
```

The LLM layer is mocked in all tests — no real API calls. This keeps tests fast, deterministic, and free of API key requirements.

**Edge cases:**

- Empty string `""` as word → 422 validation error
- Word that doesn't exist in German → agent still returns a response (LLM best-effort); validation passes since all fields are typed
- Agent timeout or provider error → 422 with descriptive error message

---

### Open Questions / Risks

- [ ] **Agent system prompt wording:** The prompt that instructs the LLM to extract German word metadata needs careful crafting to produce accurate grammatical data. **Target:** resolve during implementation via iteration
- [ ] **Enum handling in LLM output:** The LLM must return values matching `GenderEnum` and `CategoryEnum` exactly. PydanticAI's structured output should enforce this, but edge cases (e.g. LLM returning "masculine" instead of "der") need verification. **Target:** resolve during implementation
