# #78: Enrichment Audit

**GitHub Issue:** [#78 — Enrichment Audit](https://github.com/Volscente/vademecum-germanicum/issues/78)
**GitHub Milestone:** [8-multiple-prepositions](https://github.com/Volscente/vademecum-germanicum/milestone/10)
**Notion page:** [8-Multiple-Prepositions](https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def)

---

## Technical Scope

**In scope:**

- `frontend/src/components/AddWordModal.tsx` — audit `onEnrich` handler: confirm `reset()` receives the full `grammar_patterns` array per sense from `WordEnrichment`; fix any truncation found
- `frontend/src/components/EditWordModal.tsx` — audit Re-enrich handler: same confirmation or fix

**Out of scope:**

- `frontend/src/types/word.ts` — `WordEnrichment`, `Sense`, `GrammarPattern` interfaces already carry the full list shape; no changes expected
- `frontend/src/lib/wordSchema.ts` — schema aligned in TASK-1; no changes expected
- `frontend/src/lib/api.ts` — `enrichWord()` returns the raw `WordEnrichment` from the backend unchanged; no changes expected
- Backend enrichment endpoint — already returns `grammar_patterns: GrammarPattern[]` (min 1) per sense; no backend changes required

---

## Architecture

```txt
POST /words/enrich
          │
          ▼
  enrichWord(word: string): Promise<WordEnrichment>      ← api.ts
          │
          │  WordEnrichment
          │    └─ senses: Sense[]
          │         └─ grammar_patterns: GrammarPattern[]   ← must be passed in full
          │
          ▼
  onEnrich / Re-enrich handler
  (AddWordModal.tsx / EditWordModal.tsx)
          │
          ├── [AUDIT POINT] does the payload passed to reset()
          │   preserve grammar_patterns[] in full per sense,
          │   or does it extract only grammar_patterns[0]?
          │
          ▼
  reset(payload)                                          ← react-hook-form
          │
          ▼
  GrammarPatternFields (one instance per sense)
    renders one row per GrammarPattern in the RHF store
```

### Why `reset()` must receive the full `grammar_patterns` array

`useFieldArray` reads its initial rows from the RHF store at `reset()` time. If the payload remaps `grammar_patterns` to a single-element list before `reset()` is called, the field array will render only one row regardless of what the LLM returned. Passing the raw, unmodified enriched payload (or a mapping that preserves the full `grammar_patterns[]`) is the only correct path.

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/AddWordModal.tsx` | Audit / Fix | Locate `onEnrich`; confirm or fix `grammar_patterns` mapping before `reset()` |
| `frontend/src/components/EditWordModal.tsx` | Audit / Fix | Locate Re-enrich handler; same confirmation or fix |

---

### Key Functions

Locate `reset(` inside each modal's `onEnrich` / Re-enrich handler and read the argument shape.

**Correct pattern — raw payload passed directly:**

```ts
const onEnrich = async () => {
  const enriched = await enrichWord(watch("word"));
  reset(enriched);
  // grammar_patterns[] per sense is preserved automatically
};
```

**Incorrect pattern — grammar_patterns truncated to first element:**

```ts
const onEnrich = async () => {
  const enriched = await enrichWord(watch("word"));
  reset({
    ...enriched,
    senses: enriched.senses.map((s) => ({
      ...s,
      grammar_patterns: [s.grammar_patterns[0]],  // ← truncation: drop all but first
    })),
  });
};
```

If the incorrect pattern is found, the fix is to remove the `grammar_patterns` override so the full `Sense` object (or the raw `enriched` payload) passes through unmodified. This is a one-line deletion.

---

### Data Models / Schemas

Relevant interfaces already defined in `frontend/src/types/word.ts`:

```ts
interface GrammarPattern {
  preposition: string | null;  // null = no preposition required
  case: string;                // e.g. "Akkusativ", "Dativ"
}

interface Sense {
  grammar_patterns: GrammarPattern[];  // min 1; pass in full to reset()
  // ... meaning_summary, example_sentences, etc.
}

interface WordEnrichment {
  senses: Sense[];  // min 1 per backend contract
  // ... word-level fields
}
```

---

### Testing Strategy

**Audit step (read-only, no test runner needed):**

1. Open `frontend/src/components/AddWordModal.tsx`; search for `reset(` — read the argument and confirm `grammar_patterns` is not extracted to a single element before the call.
2. Open `frontend/src/components/EditWordModal.tsx`; repeat for the Re-enrich handler.

Record outcome: **no truncation found** (task closes with no code change) or **truncation found** (apply one-line fix, re-verify).

**End-to-end verification (manual, requires TASK-2 `GrammarPatternFields` UI in place):**

```bash
just dev   # start full stack: DB + backend + frontend on localhost:3000
```

Steps:

1. Open **AddWordModal** → type a German verb with multiple grammar patterns (e.g. *warten*) → click **Enrich**.
2. Confirm each Sense shows the full set of grammar pattern rows returned by the LLM — not just one.
3. Open an existing word in **EditWordModal** → click **Re-enrich**.
4. Confirm the same: all grammar pattern rows per sense are pre-populated.

**Edge cases:**

- Sense with exactly one grammar pattern → one row rendered, Remove button disabled — existing behaviour preserved regardless of the fix
- LLM returns empty `grammar_patterns` per sense → impossible (backend enforces `min_length=1`); Zod `min(1)` in `wordSchema.ts` would surface a form error before submission as a final guard

---

### Open Questions / Risks

- [ ] **Truncation confirmed or ruled out:** The audit read of both modals is the first action; if no truncation is present, this task closes with zero file changes. **Target:** start of TASK-3 session
- [ ] **End-to-end test depends on TASK-2 UI:** `GrammarPatternFields` (multi-row grammar pattern UI from TASK-2) must be in place to visually verify all rows are rendered after Enrich. Confirm TASK-2 is merged before closing TASK-3. **Target:** before closing TASK-3
