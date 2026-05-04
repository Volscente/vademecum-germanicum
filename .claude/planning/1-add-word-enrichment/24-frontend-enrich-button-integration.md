# #24: Frontend Enrich Button Integration

**GitHub Issue:** [#24 — Frontend Enrichment UI](https://github.com/Volscente/vademecum-germanicum/issues/24)
**GitHub Milestone:** [Milestone: add-word-enrichment](https://github.com/Volscente/vademecum-germanicum/milestone/3)
**Notion page:** [Add Word Enrichment](https://www.notion.so/1-Add-Word-Enrichment-3545cc6c0f0780c3a0d4e11f3aa47880)

---

## Technical Scope

**In scope:**

- `frontend/src/components/AddWordModal.tsx` — add "Enrich" button, `isEnriching`/`enrichError` state, `setValue` calls for each enriched field
- `frontend/src/lib/api.ts` — new file with `enrichWord(word: string)` fetch wrapper
- `frontend/src/types/word.ts` — add `WordEnrichment` interface matching the backend response shape

**Out of scope:**

- Enrichment in `EditWordModal.tsx` — separate flow, out of scope per RFC
- Installing a toast library — inline error message below the button is sufficient
- Frontend unit/integration tests — no existing frontend test setup in this project

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
| `frontend/src/components/AddWordModal.tsx` | Modify | Add "Enrich" button, loading/error state, `setValue` integration |

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
  category: "noun" | "verb" | "adjective" | "adverb" | "preposition" | "other";
  translation: string;
  word_plural?: string;
  example_sentences?: string;
}
```

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

**Integration test (manual):**

1. Start the full stack (`just dev`).
2. Open the Add Word modal, type `Haus`, click "Enrich".
3. Verify: translation, gender, and category fields are pre-filled with plausible values.
4. Verify: the Enrich button shows a loading indicator (disabled, text changes) during the request.
5. Verify: form fields remain editable after enrichment completes.
6. Submit normally and confirm the word is saved with the enriched values.

**Edge cases:**

- Empty word input → "Enrich" button is `disabled` (guarded by `!wordValue`)
- Backend returns 422 → `enrichError` is set and shown inline beneath the button; form state is unchanged
- Partial response (optional fields absent) → only present fields are passed to `setValue`; absent optional fields are left as-is

---

### Open Questions / Risks

- [ ] **Form fields for enriched values are not currently rendered**: `AddWordModal` only shows `word` and `translation` inputs; `gender`, `category`, `word_plural`, and `example_sentences` are set via `defaultValues` but have no corresponding UI inputs. Decide before implementing: (a) add UI inputs for the missing fields in this task, or (b) set values silently and defer rendering to a follow-up. **Target:** resolve before starting implementation.
- [ ] **Enum casing alignment**: Confirm that gender/category strings returned by the backend (`"der"`, `"noun"`, etc.) match the exact Zod enum values in `wordSchema.ts` — a casing mismatch causes `setValue` to silently set an invalid value that Zod will reject on submit. **Target:** verify during the first integration test run.
