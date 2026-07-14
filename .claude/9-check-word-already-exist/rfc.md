# [RFC] Check Word Already Exist — Vademecum Germanicum

| Author          | Simone Porreca                                                                    |
| :-------------- | :-------------------------------------------------------------------------------- |
| **Project**     | Vademecum Germanicum                                                              |
| **RFC status**  | Draft                                                                             |
| **Review deadline** | 2026-07-31                                                                    |
| **Notion page** | [9 — Check word already existing](https://app.notion.com/p/9-Check-word-already-existing-3925cc6c0f0780cb929ffeeee7632263) |
| **GitHub repo** | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum) |
| **Milestone**   | [9-check-word-already-exist](https://github.com/Volscente/vademecum-germanicum/milestone/11) |

### Timeline

| Date       | Status | Note  |
| :--------- | :----- | :---- |
| 2026-07-14 | Draft  |       |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Check Word Already Exist](#check-word-already-exist)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The word creation flow in `AddWordModal` has no guard against entering a word that already exists in the vocabulary table. Users can submit duplicate entries without any warning, which pollutes the vocabulary list and may cause confusion in the learning and review areas. There is currently no client-side or server-side mechanism that notifies the user of an existing match before the save action is committed. For full context, see the [Notion initiative page](https://app.notion.com/p/9-Check-word-already-existing-3925cc6c0f0780cb929ffeeee7632263).

## Objectives {#objectives}

- **Real-time duplicate feedback**: The user receives an inline warning in `AddWordModal` as they type, without needing to attempt submission, when the entered word matches an existing entry (case-insensitive, exact).
- **Block duplicate submission**: The save action is disabled while a confirmed duplicate is detected, making it impossible to persist a duplicate through the creation flow.
- **Disable Enrich on duplicate**: The Enrich button in `AddWordModal` is disabled when the entered word already exists, preventing a wasted LLM call on a word the user cannot save.
- **Debounced lookup**: Duplicate detection is debounced at 300 ms, consistent with the existing `SearchBar` pattern, to avoid excessive backend requests while the user is still typing.

## Scope {#scope}

**In-Scope:**

- Real-time notification in `AddWordModal` when the typed word already exists in the vocabulary table
- Block form submission when the entered word is a duplicate
- Disable the Enrich button when the entered word already exists
- DB-level `UNIQUE (word)` constraint on the `words` table, enforced by a migration script
- Backend 409 response on `POST /words/` when the constraint is violated

**Out-of-Scope:**

- **Fuzzy / phonetic matching**: only exact (case-insensitive) duplicate detection is required
- **Duplicate checking in EditWordModal**: the initiative targets word creation only

**Constraints:**

- Duplicate detection must be exact and case-insensitive, consistent with the existing search behaviour on `GET /words/?search=`.
- No new backend endpoint may be introduced if the existing search endpoint can satisfy the requirement.

---

# **Check Word Already Exist** {#check-word-already-exist}

## Approach Overview {#approach-overview}

The duplicate check operates at two layers. At the **database layer**, a `UNIQUE (word)` constraint (case-sensitive) is added to the `words` table via a migration script; the backend `POST /words/` endpoint catches the resulting integrity error and returns HTTP 409. At the **frontend layer**, `AddWordModal` performs a proactive debounced lookup so the user receives feedback before attempting submission.

When the user types in the `word` field, a `useWatch` hook observes the value and a `useEffect` sets a 300 ms debounce timer. On each debounced fire, a new `checkWordExists` helper (added to `api.ts`) calls `GET /words/?search=<value>` and filters the response for a **case-sensitive** exact match on the `word` field — aligned with the DB constraint. The result — a boolean `isDuplicate` — is stored in a `useState` variable local to `AddWordModal`. When `isDuplicate` is `true`, an inline warning is rendered below the word input, the submit button is disabled, and the Enrich button is disabled. If a duplicate somehow slips past the debounce (race condition, fast typing), the 409 response from `POST /words/` is caught and surfaced as a form-level error.

The case-sensitive matching is deliberate: in German, capitalisation is grammatically significant — "laufen" (verb) and "Laufen" (nominalised noun) are distinct vocabulary entries and must not be conflated.

One refinement over the original proposal direction: rather than relying solely on Zod's `.refine()`, the duplicate state is kept in a separate `useState` variable so the Enrich button can react to it independently of the RHF validation cycle.

### Integration {#integration}

`AddWordModal.tsx` already uses `useWatch` and `useFieldArray` for sense management, so adding another `useWatch` on the `word` field introduces no new patterns. The `api.ts` module is extended with a single `checkWordExists(word: string): Promise<boolean>` function that calls `GET /words/?search=<word>` (the same base URL already used by `enrichWord`) and returns `true` if any result has a `word` value matching the input case-insensitively. No other module (backend, `page.tsx`, `WordTable`, `EditWordModal`) is touched.

### M1 — Backend duplicate-check support {#m1-backend-duplicate-check-support}

Three changes, all backend or API-layer:

1. **Migration**: add `migrations/add_unique_word_constraint.sql` with `ALTER TABLE words ADD CONSTRAINT words_word_key UNIQUE (word);`. Run via `just run_migration`. The constraint is case-sensitive, matching German orthographic convention.
2. **Backend 409 handler**: in `main.py`, catch `IntegrityError` (or `UniqueViolation`) on `POST /words/` and return `HTTPException(status_code=409, detail="A word with this spelling already exists.")`.
3. **Frontend API helper**: add `checkWordExists(word: string): Promise<boolean>` to `api.ts`. The function calls `GET /words/?search=<word>&limit=500` and returns `true` if any result has `entry.word === word` (case-sensitive exact match).

### M2 — Frontend real-time duplicate notification in AddWordModal {#m2-frontend-real-time-duplicate-notification-in-addwordmodal}

In `AddWordModal.tsx`:

1. Add `const wordValue = useWatch({ control, name: "word" })`.
2. Add `const [isDuplicate, setIsDuplicate] = useState(false)` and `const duplicateCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)`.
3. In a `useEffect` watching `wordValue`: clear any pending timer, reset `isDuplicate` to `false`, and if `wordValue` is non-empty schedule a 300 ms call to `checkWordExists(wordValue)`. On resolution, call `setIsDuplicate(result)` and, when `true`, call `setError("word", { message: "This word already exists in your vocabulary." })`.
4. In the `onSubmit` handler, catch a 409 response from `POST /words/` and call `setError("word", { message: "This word already exists in your vocabulary." })` as a last-resort fallback.
4. Render an inline warning under the word input field when `isDuplicate` is `true` (the `setError` message surfaces via the existing `errors.word` display path in the form).

### M3 — Block save and disable Enrich on duplicate {#m3-block-save-and-disable-enrich-on-duplicate}

Gate the submit button and the Enrich button on `isDuplicate`:

- Submit button: add `|| isDuplicate` to the existing `disabled` condition.
- Enrich button: add `disabled={isDuplicate}` (and a `title` attribute with a short explanation) to the existing button props.

This milestone is a small change to `AddWordModal.tsx` and can be delivered together with M2 in the same PR, or as a follow-up once M2 is confirmed working.

## Tech Stack {#tech-stack}

- **Next.js 16 / TypeScript**: the frontend framework hosting `AddWordModal`; no version change required
- **React Hook Form**: the existing form library used by `AddWordModal`; `useWatch` and `setError` are already available and used elsewhere in the form — no new dependency
- **Zod**: the existing schema validation library; the `wordSchema` is not changed by this initiative — duplicate detection is handled outside schema validation to allow the Enrich button to react independently
- **FastAPI / `GET /words/`**: the existing search endpoint reused as the duplicate-check data source; no backend changes required

## Effort Estimations {#effort-estimations}

Total estimated effort: **3 sessions**.

| Milestone | Description | Est. effort | GitHub Issue |
| :-------- | :---------- | :---------- | :----------- |
| M1 — Backend duplicate-check support | DB migration (`UNIQUE (word)`), backend 409 handler on `POST /words/`, `checkWordExists` in `api.ts` | 1 session | #{issue} |
| M2 — Frontend real-time duplicate notification | Add `useWatch` + debounce + `setError` to `AddWordModal`; render inline warning; handle 409 in `onSubmit` | 1 session | #{issue} |
| M3 — Block save and disable Enrich on duplicate | Gate submit and Enrich button on `isDuplicate` state | 0.5 sessions | #{issue} |

### Recommended Order

1. M1 — Backend duplicate-check support (prerequisite: establishes the API helper other milestones call)
2. M2 — Frontend real-time duplicate notification (depends on M1; can be tested in isolation with a mocked `checkWordExists`)
3. M3 — Block save and disable Enrich on duplicate (depends on M2 `isDuplicate` state being available)

---

# **FAQs** {#faqs}

**Q: Why not use Zod's `.refine()` to enforce uniqueness in `wordSchema`?**

A: Zod refinements run synchronously or via `superRefine` with a manual async resolver, but React Hook Form's async validation mode would only fire the check on blur or explicit trigger — not on each keystroke. Keeping the duplicate state in a separate `useState` variable allows the Enrich button to react to it independently of the RHF validation cycle, which only gates `handleSubmit`.

**Q: The existing `GET /words/?search=` does substring matching. Won't it return false positives?**

A: Yes — a search for "laufen" would also return "anlaufen". The `checkWordExists` helper filters the response client-side for an exact case-insensitive match (`entry.word.toLowerCase() === input.toLowerCase()`), so substring results are discarded. This is safe as long as the limit parameter is set high enough to capture all words that share a substring with the input.

**Q: What prevents a duplicate from being submitted if the user types quickly before the debounce fires?**

A: The 300 ms debounce is a UX convenience, not a security gate. The backend `POST /words/` endpoint is the authoritative final guard. If the database had a unique constraint on the `word` column, a fast submission would receive an HTTP 409 or 422. Currently no such constraint exists at the database level — this is an open risk noted in the Risks table below.

**Q: Why is `EditWordModal` excluded from this initiative?**

A: Editing an existing word that is already in the table would require comparing against all other words except the one being edited, adding non-trivial state management. The initiative is scoped to creation only; EditWordModal can be addressed in a follow-up.

**Q: Terminology?**

A: No acronyms specific to this RFC. Standard project terms:

- **Sense** → a single meaning/usage entry nested under a `Word`; a word may have multiple senses
- **Enrich** → the AI-powered auto-fill flow in `AddWordModal` that calls `POST /words/enrich`

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question | Likelihood | Mitigation / Answer |
| :-------------- | :--------- | :------------------ |
| No unique constraint on `word` column in PostgreSQL — concurrent creation or a fast submission before debounce fires can still produce duplicates | Medium | **Addressed in this initiative**: M1 adds `UNIQUE (word)` to the `words` table and a 409 handler on `POST /words/`; M2 catches the 409 in the frontend as a last-resort fallback |
| `GET /words/` returns up to 100 results by default (`limit=100` backend default); if the vocabulary exceeds 100 words starting with the same substring, the exact match might not appear in the response | Low | Pass `limit=500` (or a safe upper bound) in `checkWordExists`; alternatively, add an exact-match query parameter to the backend endpoint in a future iteration |
| Debounce creates a brief window where `isDuplicate` is `false` while the network call is in flight — the save button is technically enabled for 300 ms + network latency after a duplicate is typed | Low | Acceptable UX trade-off given the non-critical nature of the check; the backend remains the authoritative guard |
| `setError` on the `word` field will be cleared by the next RHF validation cycle (e.g., on re-render or `trigger()`); this could cause the duplicate error to disappear unexpectedly | Low | Ensure the `useEffect` re-runs on every `wordValue` change so `setError` is re-applied if the duplicate condition persists; `clearErrors("word")` is called when `isDuplicate` resets to `false` |

## References {#references}

- [React Hook Form — `useWatch`](https://react-hook-form.com/docs/usewatch)
- [React Hook Form — `setError`](https://react-hook-form.com/docs/useform/seterror)
- [Vademecum Germanicum — Frontend README](frontend/README.md)
- [Vademecum Germanicum — Backend README](backend/README.md)
