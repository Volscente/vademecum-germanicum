# #86: Frontend Real-Time Duplicate Notification

**GitHub Issue:** [#86 — Frontend Real-Time Duplicate Notification](https://github.com/Volscente/vademecum-germanicum/issues/86)
**GitHub Milestone:** [9-check-word-already-exist](https://github.com/Volscente/vademecum-germanicum/milestone/11)
**Notion page:** [9 — Check word already existing](https://app.notion.com/p/9-Check-word-already-existing-3925cc6c0f0780cb929ffeeee7632263)

---

## Technical Scope

**In scope:**

- `frontend/src/components/AddWordModal.tsx` — debounced duplicate check wired to the existing `word` field, `isDuplicate` state, inline warning via `setError`/`clearErrors`, and a 409 fallback in `onSubmit`

**Out of scope:**

- Backend changes — `checkWordExists` (`frontend/src/lib/api.ts`), the `words_word_key` `UNIQUE` constraint, and the `POST /words/` 409 handler were delivered in [#85](85-backend-duplicate-check-support.md) and are reused unchanged
- Disabling the submit / Enrich buttons on `isDuplicate` — TASK-3
- `EditWordModal.tsx` — creation flow only (RFC out-of-scope)
- Fuzzy / phonetic matching — exact case-insensitive match only, already implemented in `checkWordExists`

---

## Architecture

```txt
User types in the "word" input                 [AddWordModal.tsx]
        │
        ▼
wordValue = watch("word")                       (already exists in the component — reused as-is)
        │
        ▼
useEffect([wordValue])
        │  clearTimeout(debounceRef.current)
        │  setIsDuplicate(false); clearErrors("word")
        │  if (wordValue) debounceRef.current = setTimeout(..., 300)
        │
        ▼  (after 300 ms of no further keystrokes)
checkWordExists(wordValue)                      [frontend/src/lib/api.ts — unchanged, from #85]
        │  GET /words/?search=<wordValue>&limit=500
        │
        ▼
.then(isDuplicate =>
    setIsDuplicate(isDuplicate)
    if (isDuplicate) setError("word", { message: "..." }))

── Race-condition path (submission fires before the 300 ms timer resolves) ──

onSubmit(data)
        │  POST /words/                          [backend, unchanged, from #85]
        │
        ▼
response.status === 409
        │
        ▼
setError("word", { message: "This word already exists in your vocabulary." })
```

### Why reuse `watch("word")` instead of adding a new `useWatch`

The RFC's M2 section proposed `const wordValue = useWatch({ control, name: "word" })`. `AddWordModal.tsx` already declares `const wordValue = watch("word")` (line 54) for the Enrich button's `disabled` condition — adding a second, differently-sourced subscription to the same field would be a redundant abstraction reacting to the same value twice. This spec reuses the existing `wordValue` binding as the `useEffect` dependency instead of introducing `useWatch`. Behaviour is identical: both `watch()` and `useWatch()` re-render on every keystroke of the subscribed field.

---

## Tech Stack

No new packages required. `useEffect`, `useRef`, `useState` (React) and `setError` / `clearErrors` (React Hook Form, already imported as part of `useForm`) are the only APIs involved — all already dependencies of this component.

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                                                                    |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `frontend/src/components/AddWordModal.tsx`     | Edit   | Add `isDuplicate` state, debounce ref, duplicate-check `useEffect`, and a 409 catch in `onSubmit` |
| `frontend/src/lib/api.ts`                      | Reuse  | `checkWordExists(word)` — implemented in #85, called here unchanged                              |

---

### Key Functions

```typescript
// Added to the useForm() destructure — setError and clearErrors are not
// currently destructured in AddWordModal.tsx and must be added alongside
// the existing register, handleSubmit, reset, getValues, watch, control.
const {
  register,
  handleSubmit,
  reset,
  getValues,
  watch,
  control,
  setError,
  clearErrors,
  formState: { errors },
} = useForm<WordFormValues>({ ... });

const [isDuplicate, setIsDuplicate] = useState(false);
const duplicateCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

/**
 * Debounced duplicate check on the "word" field.
 *
 * Reuses the existing `wordValue` (from `watch("word")`, line 54) as the
 * effect dependency. Clears any pending timer on every change so only the
 * last keystroke within a 300 ms window triggers a network call — the same
 * debounce interval used by SearchBar.tsx. Resets `isDuplicate` and clears
 * the "word" field error synchronously on each change so a stale duplicate
 * warning does not linger while the new value is being typed and re-checked.
 */
useEffect(() => {
  if (duplicateCheckRef.current) {
    clearTimeout(duplicateCheckRef.current);
  }
  setIsDuplicate(false);
  clearErrors("word");

  if (!wordValue) {
    return;
  }

  duplicateCheckRef.current = setTimeout(async () => {
    const exists = await checkWordExists(wordValue);
    setIsDuplicate(exists);
    if (exists) {
      setError("word", {
        message: "This word already exists in your vocabulary.",
      });
    }
  }, 300);

  return () => {
    if (duplicateCheckRef.current) {
      clearTimeout(duplicateCheckRef.current);
    }
  };
}, [wordValue, setError, clearErrors]);
```

```typescript
/**
 * Updated onSubmit — adds a 409 fallback around the existing POST /words/ call.
 *
 * Unchanged behaviour for non-duplicate submissions: on response.ok, resets
 * the form, closes the modal, and calls onWordAdded(). Adds a branch that
 * surfaces the same "word already exists" message as the debounce path when
 * the backend's words_word_key UNIQUE constraint (see #85) rejects a
 * submission that slipped past the 300 ms debounce window.
 */
const onSubmit = async (data: WordFormValues) => {
  try {
    const response = await fetch("http://localhost:8000/words/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.status === 409) {
      setError("word", {
        message: "This word already exists in your vocabulary.",
      });
      return;
    }

    if (response.ok) {
      reset({ gender: "none", category: "noun", senses: [{ ...emptySense }] });
      setIsOpen(false);
      onWordAdded();
    }
  } catch (error) {
    console.error("Failed to add word:", error);
  }
};
```

The inline warning itself needs no new JSX: `AddWordModal.tsx` already renders `{errors.word && <p className="text-red-600 text-xs mt-1">{errors.word.message}</p>}` directly under the word input (line 140), so `setError("word", ...)` surfaces through that existing path.

---

### CLI Parameters

Not applicable — this is a React component with no CLI surface.

---

### Data Models / Schemas

No new models or schemas. `isDuplicate` is a plain `boolean` `useState`; no field is added to `wordSchema` (the RFC's FAQ explains why duplicate detection stays outside Zod validation: React Hook Form's async resolver mode only re-validates on blur/`trigger()`, not on every keystroke, whereas a separate `useState` lets the debounce effect and the Enrich button react independently of the RHF validation cycle).

---

### Testing Strategy

No automated frontend test runner exists in this project (`frontend/package.json` only defines `dev`, `build`, `start`, `lint` — no `test` script), so verification is manual via `just dev`, consistent with the manual strategy already used in #85.

**Manual verification** (`just dev`, then in the browser):

- Type a word that already exists (e.g. `Haus`, if present) into "German Word" and pause for >300 ms → the red error message "This word already exists in your vocabulary." appears under the input without submitting the form.
- Clear the field or type a non-existent word → the message disappears within one debounce cycle (`clearErrors("word")` fires on every keystroke before the next check resolves).
- Type a duplicate, then immediately click "Save Word" before the 300 ms timer fires → the `POST /words/` call returns 409 (per #85's `words_word_key` constraint) and the same message is set via the `onSubmit` catch branch.
- Type a duplicate, wait for the warning, then edit the field to a non-duplicate value and submit → the word saves normally (confirms `clearErrors`/`setIsDuplicate(false)` resets state correctly and does not permanently lock the field).

**Edge cases:**

- Empty `word` field → the `useEffect` returns early (no `setTimeout` scheduled); `checkWordExists` is not called, matching its own empty-string guard from #85.
- Rapid typing (multiple keystrokes within 300 ms) → each keystroke clears the previous `setTimeout` via `duplicateCheckRef`; only the last value in the debounce window triggers `checkWordExists`, preventing a burst of requests and out-of-order responses overwriting a newer result.
- Modal closed and reopened mid-debounce → the effect's cleanup function clears any pending timer when `AddWordModal` unmounts/remounts, so a stale check cannot fire against a cleared form.

---

### Open Questions / Risks

- [x] **`setError` cleared by a later RHF validation cycle:** noted as a Low-likelihood risk in the RFC. **Resolved by design:** the `useEffect` re-runs on every `wordValue` change and calls `clearErrors("word")` synchronously before re-scheduling the check, so a stale duplicate error cannot outlive the field value that caused it. Confirm during the manual testing pass above; no further action planned.
- [x] **Debounce window leaves `isDuplicate` briefly `false` while the network call is in flight:** inherited from the RFC's risk table. **Resolved as an accepted trade-off:** the backend 409 fallback in `onSubmit` remains the authoritative guard for this window (same acceptance as #85); no change of behaviour requested.
