# Add Multiple Prepositions — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [8-multiple-prepositions](https://github.com/Volscente/vademecum-germanicum/milestone/10)
**Notion page:** [8-Multiple-Prepositions](https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def)
**Total estimated effort:** 2.5 FTE-days (1 FTE = 1 day)

---

## Overview

This initiative extends the Vademecum Germanicum frontend to allow multiple grammar patterns (preposition + case pairs) per sense, replacing the current single-row constraint in both word creation and editing forms. The backend already supports a `grammar_patterns` list (min 1) per sense — the gap is entirely in the UI layer across `AddWordModal.tsx`, `EditWordModal.tsx`, and `wordSchema.ts`. The work introduces a `GrammarPatternFields` sub-component using nested `useFieldArray`, Add/Remove controls with a min-1 guard, a collapsible card in `EditWordModal` matching the existing Verb Morphology pattern, and an enrichment-mapping audit to ensure all LLM-returned grammar patterns are pre-populated.

### Dependency Order

```txt
TASK-1 ──► TASK-2 ──► TASK-3
```

---

## TASK-1 — Schema & Types

**GitHub Issue:** #{issue}
**Effort estimate:** 0.5 FTE-days

### Scope

Audit `wordSchema.ts` to confirm `grammar_patterns` is defined as `z.array(grammarPatternSchema).min(1)` inside `senseSchema`. Verify `word.ts` types (`GrammarPattern`, `Sense`) align with the expected list shape on both the frontend form side and the enrichment response side.

### Goal

Establish the type contract that both `AddWordModal` and `EditWordModal` derive from before any component code is touched. A correct `grammar_patterns: z.array(grammarPatternSchema).min(1)` in `wordSchema.ts` ensures the Zod constraint propagates automatically to `WordFormValues` and both modals without divergence.

### Deliverables

- `frontend/src/lib/wordSchema.ts` — confirm or update `senseSchema.grammar_patterns` to `z.array(grammarPatternSchema).min(1)`
- `frontend/src/types/word.ts` — confirm `GrammarPattern[]` is the typed shape on `Sense` and `WordEnrichment`

### Technical Overview

Both `AddWordModal` and `EditWordModal` infer their form types from `WordFormValues = z.infer<typeof wordSchema>`. The `senseSchema` field `grammar_patterns` must be `z.array(grammarPatternSchema).min(1)` — mirroring the Pydantic `min_length=1` on the backend — so Zod rejects zero-length arrays before any HTTP request is made. If the shape is already correct, this task is a confirmation with no file changes required.

---

## TASK-2 — Nested Field Arrays

**GitHub Issue:** #{issue}
**Effort estimate:** 1.5 FTE-days

### Scope

Implement the `GrammarPatternFields` sub-component and wire nested `useFieldArray` for grammar patterns inside the sense loop in both `AddWordModal.tsx` and `EditWordModal.tsx`. Add Add/Remove controls with the Remove button disabled when `fields.length === 1`. Wrap the Grammar Patterns block in a collapsible card in `EditWordModal` using the existing `max-h` CSS toggle pattern.

### Goal

Users can add and remove grammar pattern rows per sense in both modals, with the Remove button disabled at one row to enforce the min-1 constraint visually before form submission. The Grammar Patterns section in `EditWordModal` must be collapsible via a header click, matching the Verb Morphology and Sense card pattern already in place.

### Deliverables

- `frontend/src/components/GrammarPatternFields.tsx` — new sub-component; receives `{ senseIndex, control, errors }`, calls `useFieldArray({ control, name: \`senses.${senseIndex}.grammar_patterns\` })`, renders preposition + case inputs, Add button, Remove button (disabled at 1 row)
- `frontend/src/components/AddWordModal.tsx` — replace single grammar pattern row with `<GrammarPatternFields senseIndex={index} control={control} errors={errors} />`
- `frontend/src/components/EditWordModal.tsx` — same `<GrammarPatternFields>` wire-up; add collapsible card wrapper for the Grammar Patterns section; add `grammarPatternsCollapsed: boolean[]` state synced via `useEffect` on `fields.length` if per-sense collapse tracking is needed

### Technical Overview

React Hook Form's `useFieldArray` must be called unconditionally from a component body (Rules of Hooks forbid calls inside `.map()`). The `GrammarPatternFields` sub-component pattern is the only correct approach for a nested array inside a sense loop. The name path must be exactly `` `senses.${senseIndex}.grammar_patterns` `` — incorrect paths silently yield `undefined` values without a runtime error, making the smoke test (create a word with two grammar patterns and inspect the saved payload) the critical verification step.

For `EditWordModal`, the collapsible card reuses the same CSS-only `max-h` toggle already in place for Verb Morphology and Sense sections. If Grammar Pattern collapse state is tracked independently per sense, a `grammarPatternsCollapsed: boolean[]` array synced via the same `useEffect` pattern as `sensesCollapsed` (triggering on `fields.length` changes) is the lowest-risk approach.

---

## TASK-3 — Enrichment Audit

**GitHub Issue:** #{issue}
**Effort estimate:** 0.5 FTE-days

### Scope

Audit the `onEnrich` handler in both `AddWordModal.tsx` and `EditWordModal.tsx` to confirm the full `grammar_patterns` array per sense is passed to `reset()` and not truncated to the first element. Fix any truncation found.

### Goal

After clicking Enrich, all grammar patterns returned by `POST /words/enrich` are pre-populated in the form — not just the first per sense — verified end-to-end using the multi-row UI introduced in TASK-2.

### Deliverables

- `frontend/src/components/AddWordModal.tsx` — confirmed or fixed `onEnrich` / `reset()` mapping to pass the full `grammar_patterns` list per sense
- `frontend/src/components/EditWordModal.tsx` — same confirmation or fix

### Technical Overview

`WordEnrichment` (in `word.ts`) already carries `senses: Sense[]`, and each `Sense` has `grammar_patterns: GrammarPattern[]`. When `reset()` is called with the raw enriched payload, RHF populates all grammar pattern rows automatically. The audit checks whether any intermediate mapping in `onEnrich` extracts only `grammar_patterns[0]` per sense before the `reset()` call. If truncation is found, the fix is replacing the extraction with the full array — a one-line change.

---

## GitHub Issues

### Milestone 1 — Schema & Types

**Tasks:** TASK-1
**Effort:** 0.5 FTE-days

#### Scope

Confirm or update the `grammar_patterns` list shape in `wordSchema.ts` and verify matching types in `word.ts`, establishing the type contract for all downstream component work.

#### Goal

`wordSchema.ts` correctly defines `grammar_patterns: z.array(grammarPatternSchema).min(1)` inside `senseSchema`, and `word.ts` reflects the list shape — making `WordFormValues` and both modals type-safe for the multi-pattern flow.

#### Deliverables

- Confirmed or updated `grammar_patterns` list type in `frontend/src/lib/wordSchema.ts`
- Confirmed `GrammarPattern[]` typing on `Sense` and `WordEnrichment` in `frontend/src/types/word.ts`

---

### Milestone 2 — Nested Field Arrays

**Tasks:** TASK-2
**Effort:** 1.5 FTE-days

#### Scope

Create the `GrammarPatternFields` sub-component and wire nested `useFieldArray` in both modals, including Add/Remove controls and the collapsible Grammar Patterns card in `EditWordModal`.

#### Goal

Users can add and remove grammar pattern rows per sense in both `AddWordModal` and `EditWordModal`. The Remove button is disabled at one row. The Grammar Patterns section in `EditWordModal` collapses and expands via a header click.

#### Deliverables

- New `frontend/src/components/GrammarPatternFields.tsx` sub-component with nested field array logic
- Updated `frontend/src/components/AddWordModal.tsx` using `GrammarPatternFields` per sense
- Updated `frontend/src/components/EditWordModal.tsx` using `GrammarPatternFields` per sense with collapsible card

---

### Milestone 3 — Enrichment Audit

**Tasks:** TASK-3
**Effort:** 0.5 FTE-days

#### Scope

Audit and, if needed, fix the `onEnrich` handler in both modals to propagate the full `grammar_patterns` list per sense through the `reset()` call.

#### Goal

Clicking Enrich in either modal pre-populates all grammar patterns per sense returned by the LLM — not just the first one — verified end-to-end against the multi-row UI from Milestone 2.

#### Deliverables

- Confirmed or fixed `onEnrich` handler in `frontend/src/components/AddWordModal.tsx`
- Confirmed or fixed `onEnrich` handler in `frontend/src/components/EditWordModal.tsx`
