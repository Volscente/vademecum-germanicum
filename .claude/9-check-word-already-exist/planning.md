# Check Word Already Exist — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [9-check-word-already-exist](https://github.com/Volscente/vademecum-germanicum/milestone/11)
**Notion page:** [9 — Check word already existing](https://app.notion.com/p/9-Check-word-already-existing-3925cc6c0f0780cb929ffeeee7632263)
**Total estimated effort:** 2 FTE-days (1 FTE = 1 day)

---

## Overview

This initiative adds two-layer duplicate prevention to the word creation flow. A `UNIQUE (word)` constraint is added to the PostgreSQL `words` table and the backend returns HTTP 409 on violation. The frontend `AddWordModal` proactively checks for duplicates via a debounced lookup and disables the submit and Enrich buttons when a match is found, with a 409 fallback for race conditions.

### Dependency Order

```txt
TASK-1 ──► TASK-2 ──► TASK-3
```

---

## TASK-1 — Backend Duplicate-Check Support

**GitHub Issue:** #{issue}
**Effort estimate:** 0.5 FTE-days

### Scope

Add a DB-level unique constraint on the `word` column, wire a 409 error response into `POST /words/`, and expose a `checkWordExists` helper in the frontend API client.

### Goal

Establish the authoritative duplicate guard at the database layer and provide the frontend with the API helper it needs to perform proactive lookups.

### Deliverables

- `migrations/add_unique_word_constraint.sql` — `ALTER TABLE words ADD CONSTRAINT words_word_key UNIQUE (word);`
- `backend/src/backend/main.py` — catch `IntegrityError` on `POST /words/` and return `HTTPException(status_code=409, detail="A word with this spelling already exists.")`
- `frontend/src/lib/api.ts` — `checkWordExists(word: string): Promise<boolean>` calling `GET /words/?search=<word>&limit=500`; returns `true` if any result has `entry.word === word` (case-sensitive)

### Technical Overview

The migration uses a plain `ALTER TABLE` statement consistent with the existing migration pattern (`just run_migration`). The constraint is case-sensitive, reflecting German orthographic convention where "laufen" (verb) and "Laufen" (noun) are distinct entries. The 409 handler in `main.py` catches `sqlalchemy.exc.IntegrityError` (or the underlying `psycopg2.errors.UniqueViolation`) before SQLAlchemy propagates it as a 500. The `checkWordExists` helper in `api.ts` reuses the existing `http://localhost:8000` base URL already used by `enrichWord`; the `limit=500` parameter prevents the vocabulary from outgrowing the default `limit=100` response window.

---

## TASK-2 — Frontend Real-Time Duplicate Notification

**GitHub Issue:** #{issue}
**Effort estimate:** 1 FTE-day

### Scope

Instrument `AddWordModal.tsx` with a debounced duplicate check that surfaces an inline warning as the user types, and handle the 409 fallback in `onSubmit`.

### Goal

The user sees an inline error message under the word input field within 300 ms of pausing on a word that already exists, without needing to attempt submission.

### Deliverables

- `frontend/src/components/AddWordModal.tsx` — `useWatch` on the `word` field, `useState(false)` for `isDuplicate`, `useRef` for the debounce timer, `useEffect` firing `checkWordExists` after 300 ms, `setError("word", ...)` on duplicate detected, `clearErrors("word")` on reset, 409 catch in `onSubmit`

### Technical Overview

`useWatch({ control, name: "word" })` observes the field value without triggering a full re-render of the form. The `useEffect` clears any pending `setTimeout` ref before scheduling a new 300 ms call to `checkWordExists`; this prevents stale responses from overwriting a more recent result. On a positive match, `setIsDuplicate(true)` and `setError("word", { message: "This word already exists in your vocabulary." })` are called; the `setError` message surfaces via the existing `errors.word` display path already present in the form, so no new UI component is needed. The `onSubmit` handler wraps the `POST /words/` call in a try/catch; a 409 response triggers the same `setError` call as the debounce path, covering race conditions where the debounce window was not yet complete at submission time.

---

## TASK-3 — Block Save and Disable Enrich on Duplicate

**GitHub Issue:** #{issue}
**Effort estimate:** 0.5 FTE-days

### Scope

Gate the submit button and the Enrich button in `AddWordModal.tsx` on the `isDuplicate` state introduced in TASK-2.

### Goal

The user cannot persist or enrich a duplicate word — both actions are visually and functionally disabled while a duplicate is detected.

### Deliverables

- `frontend/src/components/AddWordModal.tsx` — `|| isDuplicate` added to the submit button `disabled` condition; `disabled={isDuplicate}` and a `title` attribute added to the Enrich button props

### Technical Overview

Both changes are additive one-liners on the existing button elements in `AddWordModal.tsx`. The `isDuplicate` boolean is already available in component scope from TASK-2. The `title` attribute on the disabled Enrich button provides a tooltip explaining why enrichment is blocked, consistent with accessibility best practices.

---

## GitHub Issues

### Milestone 1 — Backend Duplicate-Check Support

**Tasks:** TASK-1
**Effort:** 0.5 FTE-days

#### Scope

All backend and API-layer changes required to enforce and detect word uniqueness: the PostgreSQL migration, the 409 error handler, and the frontend API helper.

#### Goal

After this milestone, the database enforces uniqueness on the `word` column and the frontend has a working `checkWordExists` function ready to be wired into the UI.

#### Deliverables

- `migrations/add_unique_word_constraint.sql` with `UNIQUE (word)` constraint
- 409 response on `POST /words/` for duplicate word submissions
- `checkWordExists(word: string): Promise<boolean>` in `frontend/src/lib/api.ts`

---

### Milestone 2 — Frontend Real-Time Duplicate Notification

**Tasks:** TASK-2
**Effort:** 1 FTE-day

#### Scope

Debounced duplicate check wired into `AddWordModal`, inline error feedback on the word input field, and 409 fallback handling in the submit handler.

#### Goal

After this milestone, the user receives inline feedback within 300 ms of pausing on a duplicate word, and a 409 response is surfaced as a field-level error if the debounce window was bypassed.

#### Deliverables

- `useWatch` + `useEffect` debounce in `frontend/src/components/AddWordModal.tsx`
- `isDuplicate` state and `setError` integration in `AddWordModal.tsx`
- 409 catch block in `onSubmit` in `AddWordModal.tsx`

---

### Milestone 3 — Block Save and Disable Enrich on Duplicate

**Tasks:** TASK-3
**Effort:** 0.5 FTE-days

#### Scope

UI enforcement: disable the submit and Enrich buttons in `AddWordModal` whenever a duplicate word is detected.

#### Goal

After this milestone, neither the save action nor the AI enrichment call can be triggered while a duplicate is present, completing the full duplicate-prevention flow.

#### Deliverables

- Submit button gated on `isDuplicate` in `frontend/src/components/AddWordModal.tsx`
- Enrich button disabled with `title` tooltip in `frontend/src/components/AddWordModal.tsx`
