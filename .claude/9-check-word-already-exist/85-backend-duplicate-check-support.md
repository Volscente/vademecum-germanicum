# #85: Backend Duplicate-Check Support

**GitHub Issue:** [#85 — Backend Duplicate-Check Support](https://github.com/Volscente/vademecum-germanicum/issues/85)
**GitHub Milestone:** [9-check-word-already-exist](https://github.com/Volscente/vademecum-germanicum/milestone/11)
**Notion page:** [9 — Check word already existing](https://app.notion.com/p/9-Check-word-already-existing-3925cc6c0f0780cb929ffeeee7632263)

---

## Technical Scope

**In scope:**

- `migrations/add_unique_word_constraint.sql` — New migration: `ALTER TABLE words ADD CONSTRAINT words_word_key UNIQUE (word);`
- `backend/src/backend/main.py` — Catch `IntegrityError` on `POST /words/` and return HTTP 409
- `frontend/src/lib/api.ts` — Add `checkWordExists(word: string): Promise<boolean>` helper

**Out of scope:**

- Fuzzy / phonetic duplicate matching — exact (case-sensitive) only
- Duplicate detection in `EditWordModal` — creation flow only
- New backend endpoint — the existing `GET /words/` endpoint is reused
- Frontend UI wiring (`AddWordModal` state, debounce, button gating) — TASK-2 and TASK-3

---

## Architecture

```txt
User types in AddWordModal (TASK-2)
        │
        ▼
checkWordExists(word: string)              [frontend/src/lib/api.ts]
        │  GET /words/?search=<word>&limit=500
        │
        ▼
GET /words/ handler                        [backend/src/backend/main.py]
        │  returns Word[] (existing endpoint, unchanged)
        │
        ▼
client-side filter: entry.word === word    [checkWordExists]
        │  → boolean (true = duplicate found)
        │
        ▼
isDuplicate state in AddWordModal          (wired in TASK-2)

── Race-condition path (fast submission before debounce fires) ──
        │
        ▼
POST /words/                               [backend/src/backend/main.py]
        │  DB UNIQUE (word) constraint violated
        │
        ▼
SQLAlchemy raises IntegrityError
        │
        ▼
409 HTTPException("A word with this spelling already exists.")
        │
        ▼
Caught in onSubmit → setError("word", …)  (wired in TASK-2)
```

### Why case-sensitive constraint with case-insensitive client filter

The PostgreSQL `UNIQUE (word)` constraint is case-sensitive, which is correct for German: "laufen" (verb) and "Laufen" (nominalised noun) are distinct orthographic entries that must coexist. The `checkWordExists` helper filters client-side using `entry.word.toLowerCase() === word.toLowerCase()` to give the user a proactive warning even when capitalisation differs — it is a UX guard, not a semantic one. The DB constraint is the authoritative uniqueness gate.

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                                            |
| --------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `migrations/add_unique_word_constraint.sql`   | Create | Plain `ALTER TABLE` adding `UNIQUE (word)` to the `words` table        |
| `backend/src/backend/main.py`                 | Edit   | Catch `IntegrityError` in `POST /words/` handler; return HTTP 409      |
| `frontend/src/lib/api.ts`                     | Edit   | Add `checkWordExists` alongside existing `enrichWord`, `updateWord` etc |

---

### Key Functions

**`checkWordExists` — TypeScript, `frontend/src/lib/api.ts`**

```typescript
/**
 * Check whether a word already exists in the vocabulary table.
 *
 * Calls GET /words/?search=<word>&limit=500 and filters the response for a
 * case-insensitive exact match on the `word` field. The search endpoint does
 * substring matching, so client-side filtering is required to avoid false
 * positives (e.g. "laufen" matching "anlaufen").
 *
 * @param word - The word string to check, as typed by the user.
 * @returns Promise resolving to true if an exact (case-insensitive) match
 *          exists, false otherwise.
 */
async function checkWordExists(word: string): Promise<boolean>
```

**`POST /words/` handler change — Python, `backend/src/backend/main.py`**

```python
def create_word(word: WordCreate, db: Session = Depends(get_db)) -> WordRead:
    """Create a new word with its full sense graph.

    Unchanged behaviour for valid payloads. Adds an IntegrityError catch so
    that a UNIQUE (word) constraint violation on the `words` table returns
    HTTP 409 instead of propagating as an unhandled 500.

    Args:
        word: Validated WordCreate payload including at least one Sense.
        db: SQLAlchemy session injected by FastAPI dependency.

    Returns:
        WordRead representation of the newly created word.

    Raises:
        HTTPException(409): When the submitted word value already exists in
            the `words` table (constraint: words_word_key UNIQUE (word)).
        HTTPException(422): When the payload fails Pydantic validation
            (existing behaviour, unchanged).
    """
```

---

### CLI Parameters

Not applicable — this task has no CLI surface.

---

### Data Models / Schemas

No new models or schemas. The existing `WordCreate`, `WordRead`, and `Word` (TypeScript interface) are unchanged. The `checkWordExists` response is a plain `boolean`.

---

### Testing Strategy

**Backend tests** (`backend/tests/test_words.py`):

- `test_create_word_duplicate_returns_409` — POST the same word twice; assert the second response is HTTP 409 with `detail` matching `"A word with this spelling already exists."`
- `test_create_word_case_sensitive_duplicate` — POST "Laufen" then POST "laufen"; assert both succeed (HTTP 201), confirming the constraint is case-sensitive and the two entries are treated as distinct

**Frontend tests** (manual, using `just dev`):

```bash
# With the stack running, open the browser console and call:
fetch("http://localhost:8000/words/?search=Haus&limit=500")
  .then(r => r.json())
  .then(words => console.log(words.some(w => w.word.toLowerCase() === "haus")))
# Expect: true (if "Haus" exists), false otherwise
```

**Migration verification:**

```bash
just run_migration   # applies add_unique_word_constraint.sql
# Then in psql:
\d words             # confirm words_word_key UNIQUE (word) appears in indexes
```

**Edge cases:**

- Empty `word` string passed to `checkWordExists` → return `false` immediately without making a network call (guard at function entry)
- `GET /words/` returns an empty array → `checkWordExists` returns `false` (no match)
- Vocabulary exceeds 500 words sharing a substring → `limit=500` mitigates the risk; acceptable for current scale

---

### Open Questions / Risks

- [ ] **`limit=500` sufficiency:** If the vocabulary grows beyond 500 entries sharing a common substring, `checkWordExists` may miss the exact match. **Target:** revisit when word count exceeds 400 (add an exact-match query parameter to the backend as a follow-up)
- [ ] **Migration is irreversible without a companion `DROP CONSTRAINT` script:** if the constraint needs to be removed (e.g. to allow duplicates during a data import), a rollback script must be written manually. **Target:** acceptable for now; document in `migrations/README.md` if one is created
