# #24: Frontend Enrich Button Integration

**GitHub Issue:** [#24 — Frontend Enrichment UI](https://github.com/Volscente/vademecum-germanicum/issues/24)
**GitHub Milestone:** [Milestone: add-word-enrichment](https://github.com/Volscente/vademecum-germanicum/milestone/3)
**Notion page:** [Add Word Enrichment](https://www.notion.so/1-Add-Word-Enrichment-3545cc6c0f0780c3a0d4e11f3aa47880)

---

## Technical Scope

**In scope:**

- `frontend/src/components/AddWordModal.tsx` — add "Enrich" button, `isEnriching`/`enrichError` state, `setValue` calls, and UI inputs for `gender`, `category`, `word_plural`, `example_sentences`
- `frontend/src/lib/api.ts` — new file with `enrichWord(word: string)` fetch wrapper
- `frontend/src/types/word.ts` — add `WordEnrichment` interface matching the backend response shape
- `frontend/src/lib/wordSchema.ts` — align `category` enum values with backend `CategoryEnum` (see Data Models section)
- `backend/tests/test_enrichment.py` — add unit test verifying enum serialisation matches frontend expectations

**Out of scope:**

- Enrichment in `EditWordModal.tsx` — separate flow, out of scope per RFC
- Installing a toast library — inline error message below the button is sufficient
- Adding UI inputs for `word_nominative`, `word_genitive`, `prepositions`, `idiomatic_usages` — these fields exist in `WordEnrichment` but are not in the current `wordSchema`; deferred to a follow-up

---

## Architecture

```txt
AddWordModal (AddWordModal.tsx)
    │
    │  user types word → word input non-empty → "Enrich" button enabled
    │  user clicks "Enrich"
    │
    ▼
onEnrich()
    │  word = getValues("word")
    │  setIsEnriching(true), setEnrichError(null)
    │
    ▼
enrichWord(word)                          ── frontend/src/lib/api.ts
    │  POST http://localhost:8000/words/enrich
    │  body: { word }
    │
    │  on success → WordEnrichment
    ├──────────────────────────────────────► setValue("translation", ...)
    │                                        setValue("gender", ...)
    │                                        setValue("category", ...)
    │                                        setValue("word_plural", ...)       [if present]
    │                                        setValue("example_sentences", ...) [if present]
    │
    │  on error
    └──────────────────────────────────────► setEnrichError("Could not enrich word. Please try again.")
                                             (form state unchanged)
```

### Why a dedicated `api.ts` rather than an inline fetch

No shared API layer exists today (`frontend/src/lib/` contains only `wordSchema.ts`). Isolating the fetch call keeps `AddWordModal` focused on UI logic and makes the endpoint contract easy to locate when the backend schema changes.

---

## Tech Stack

No new packages required. `setValue` and `getValues` are already part of React Hook Form, which the component already uses.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
| ---- | ------ | ----------- |
| `frontend/src/lib/api.ts` | Create | `enrichWord` fetch wrapper for `POST /words/enrich` |
| `frontend/src/types/word.ts` | Modify | Add `WordEnrichment` interface for the enrichment response |
| `frontend/src/lib/wordSchema.ts` | Modify | Align `category` enum with backend (replace `"preposition"` / `"other"` → `"pronoun"`) |
| `frontend/src/components/AddWordModal.tsx` | Modify | Add gender/category selects, word_plural/example_sentences inputs, "Enrich" button, loading/error state, `setValue` integration |
| `backend/tests/test_enrichment.py` | Modify | Add unit test verifying enum values in the response serialise as lowercase strings |

---

### Key Functions

```typescript
// frontend/src/lib/api.ts

async function enrichWord(word: string): Promise<WordEnrichment>
/**
 * Call POST /words/enrich and return the enriched word metadata.
 *
 * Args:
 *   word: The German word string to enrich.
 *
 * Returns:
 *   A WordEnrichment object with LLM-populated fields.
 *
 * Raises:
 *   Error: If the HTTP response status is not ok (4xx / 5xx).
 */
```

```typescript
// Inside AddWordModal component

async function onEnrich(): Promise<void>
/**
 * Click handler for the "Enrich" button.
 *
 * Reads the current word input via getValues("word"), calls enrichWord,
 * and populates each returned field via setValue. Sets enrichError on failure.
 *
 * Args:
 *   none — reads word from form state internally
 *
 * Returns:
 *   void — side effects: setValue calls per enriched field, state updates
 *
 * Raises:
 *   Does not throw — errors are caught and written to enrichError state.
 */
```

---

### Data Models / Schemas

```typescript
// Addition to frontend/src/types/word.ts

export interface WordEnrichment {
  gender: "der" | "die" | "das" | "none";
  word_nominative: string | null;
  word_genitive: string | null;
  word_plural: string | null;
  translation: string;
  category: "noun" | "verb" | "adjective" | "adverb" | "pronoun";
  prepositions: string | null;
  example_sentences: string | null;
  idiomatic_usages: string | null;
}
```

`wordSchema.ts` category enum must be updated to match `CategoryEnum` in the backend. The current frontend enum (`"preposition"`, `"other"`) differs from the backend (`"pronoun"`). **Align to the backend's values:**

```typescript
// frontend/src/lib/wordSchema.ts — updated category enum
category: z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",       // replaces "preposition" and "other"
]),
```

> **Note:** Removing `"preposition"` and `"other"` is a breaking change for any words already saved with those categories. Check the database before deploying.

New state inside `AddWordModal`:

```typescript
const [isEnriching, setIsEnriching] = useState(false);
const [enrichError, setEnrichError] = useState<string | null>(null);
```

`useForm` destructuring gains `setValue`, `getValues`, and `watch`:

```typescript
const {
  register,
  handleSubmit,
  reset,
  setValue,
  getValues,
  watch,
  formState: { errors },
} = useForm<WordFormValues>({ ... });

const wordValue = watch("word"); // drives button disabled state
```

---

### Testing Strategy

**Unit test — enum serialisation (`backend/tests/test_enrichment.py`):**

Add a test that mocks `enrich_word` to return a `WordEnrichment` with known enum values, calls `POST /words/enrich` via `TestClient`, and asserts the response JSON contains lowercase string values (not Python enum names):

```python
def test_enrich_endpoint_serialises_enums_as_strings(client, monkeypatch):
    """Verify that gender and category are serialised as lowercase strings.

    The frontend Zod schema expects plain strings ("der", "noun"), not
    the Python enum repr. A mismatch causes setValue to silently fail.
    """
    mock_result = WordEnrichment(
        gender=GenderEnum.der,
        category=CategoryEnum.noun,
        translation="house",
        word_nominative="Haus",
        word_genitive="des Hauses",
        word_plural="Häuser",
        prepositions=None,
        example_sentences=None,
        idiomatic_usages=None,
    )

    async def mock_enrich(word: str) -> WordEnrichment:
        return mock_result

    monkeypatch.setattr("backend.main.enrich_word", mock_enrich)

    response = client.post("/words/enrich", json={"word": "Haus"})

    assert response.status_code == 200
    body = response.json()
    assert body["gender"] == "der"      # string, not "GenderEnum.der"
    assert body["category"] == "noun"   # string, not "CategoryEnum.noun"
    assert body["translation"] == "house"
```

Run with:

```bash
docker-compose run --rm --build backend uv run --package backend pytest backend/tests/test_enrichment.py::test_enrich_endpoint_serialises_enums_as_strings
```

**Integration test (manual):**

1. Start the full stack (`just dev`).
2. Open the Add Word modal, type `Haus`, click "Enrich".
3. Verify: translation, gender, category, and word_plural fields are pre-filled.
4. Verify: the Enrich button shows a loading indicator during the request.
5. Verify: form fields remain editable after enrichment completes.
6. Submit normally and confirm the word is saved with the enriched values.

**Edge cases:**

- Empty word input → "Enrich" button is `disabled` (guarded by `!wordValue`)
- Backend returns 422 → `enrichError` is set and shown inline beneath the button; form state is unchanged
- Optional fields `null` in response → those `setValue` calls are skipped; fields retain their default values

---

### Open Questions / Risks

- [x] **Form fields for enriched values are not currently rendered**: Resolved — option (a) chosen. Add UI inputs for `gender` (select), `category` (select), `word_plural` (text), and `example_sentences` (textarea) to `AddWordModal` as part of this task. Fields `word_nominative`, `word_genitive`, `prepositions`, `idiomatic_usages` are deferred.
- [x] **Enum casing alignment**: Resolved — discrepancy confirmed. The backend `CategoryEnum` contains `"pronoun"`; the frontend Zod schema has `"preposition"` and `"other"` instead. **Action before implementing:** update `wordSchema.ts` to replace `"preposition"` / `"other"` with `"pronoun"`, and check whether any saved words use those values (run `SELECT DISTINCT category FROM words;` against the database).
- [x] **Breaking change from enum alignment**: Resolved — `just empty_words` command added to the justfile. Run it before deploying the enum change to truncate the words table (resets IDs too). Requires the `db` container to be running (`just run_database` first).
