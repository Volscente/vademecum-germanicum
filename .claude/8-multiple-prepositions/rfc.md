# [RFC] Add Multiple Prepositions — Vademecum Germanicum

| Author              | Simone Porreca                                                                                             |
| :------------------ | :--------------------------------------------------------------------------------------------------------- |
| **Project**         | Vademecum Germanicum                                                                                       |
| **RFC status**      | Draft                                                                                                      |
| **Review deadline** | 2026-06-07                                                                                                 |
| **Notion page**     | [8-Multiple-Prepositions](https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def) |
| **GitHub repo**     | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)                        |
| **Milestone**       | [8-multiple-prepositions](https://github.com/Volscente/vademecum-germanicum/milestone/10)                  |

### Timeline

| Date       | Status | Note |
| :--------- | :----- | :--- |
| 2026-06-11 | Draft  |      |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Multiple Grammar Patterns](#multiple-grammar-patterns)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The Grammar Patterns section inside a Sense Card currently renders only a single row — one preposition and one grammatical case. In German, a single semantic meaning of a verb, adjective, or noun can combine with multiple prepositions and cases depending on context (e.g. *warten auf + Akk.* and *warten mit + Dat.*). The rigid single-row constraint prevents users from capturing complete and linguistically accurate data in their vocabulary logs. For full context, see the [Notion initiative page](https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def).

## Objectives {#objectives}

- **Enable multiple grammar patterns per sense**: Users can add and remove Grammar Pattern rows in both `AddWordModal` and `EditWordModal`, reflecting the full range of preposition + case combinations a sense can take.
- **Enforce minimum-one constraint end-to-end**: The UI prevents removal of the last grammar pattern row; Zod enforces `min(1)` on `grammar_patterns`; and the backend HTTP 422 guard remains the final safeguard.
- **Collapsible Grammar Patterns card**: The Grammar Patterns section is rendered inside a collapsible card (CSS `max-h` toggle, header click) in `EditWordModal`, matching the established pattern for Verb Morphology and Sense sections.
- **Complete enrichment mapping**: After clicking Enrich, all grammar patterns returned by the LLM are pre-populated per sense — not just the first one.
- **Single schema source of truth**: `wordSchema.ts` remains the only place where grammar pattern validation logic lives; both modals derive their form types from it without divergence.

## Scope {#scope}

**In-Scope:**

- Vocabulary Area — `AddWordModal.tsx` and `EditWordModal.tsx` form changes
- `wordSchema.ts` validation confirmation or update (`grammar_patterns: list min(1)`)
- Enrichment mapping audit in both modals

**Out-of-Scope:**

- **Review Area**: `SenseCard.tsx` is a read-only flashcard; surfacing multiple grammar patterns there is deferred to a future initiative.
- **Backend changes**: The backend already supports `grammar_patterns: list[GrammarPatternCreate]` with min-1 enforced at the Pydantic layer; no schema changes, new endpoints, or migrations are required.
- **New dependencies**: `react-hook-form` `useFieldArray` and the existing Zod schemas fully cover the requirement; no additional packages will be introduced.

**Constraints:**

- Every Sense must retain at least one Grammar Pattern — enforced at the Zod layer (`min(1)`) and in the UI (Remove button disabled when only one row remains), with the backend HTTP 422 as the final guard.
- `wordSchema.ts` is the single source of truth for form validation; `AddWordModal` and `EditWordModal` must both use it without diverging.
- No backend schema changes, no new API endpoints, no Alembic migrations.

---

# **Multiple Grammar Patterns** {#multiple-grammar-patterns}

## Approach Overview {#approach-overview}

This is a **frontend-only change**. The backend already accepts `grammar_patterns: list[GrammarPatternCreate]` (min 1) per sense, and the enrichment endpoint already returns a full `grammar_patterns` list per sense in the `WordEnrichment` response. The gap is entirely in the UI layer.

The core technical challenge is implementing **nested `useFieldArray` inside the sense loop**. React Hook Form's `useFieldArray` hook must be called unconditionally from a React component body — calling it inside a `.map()` callback violates the Rules of Hooks and produces runtime errors. The canonical solution is to extract the per-sense grammar pattern block into a dedicated sub-component (e.g. `GrammarPatternFields`) that receives `senseIndex`, `control`, and `errors` as props and internally calls `useFieldArray` with the name path `` `senses.${senseIndex}.grammar_patterns` ``. This keeps each sense's field array isolated and index management stable.

The approach described in the proposal is adopted in full: nested `useFieldArray` per sense, Add/Remove controls (Remove disabled when exactly one row remains), collapsible Grammar Patterns card in `EditWordModal` using the existing `max-h` CSS toggle pattern, and an enrichment-mapping audit before touching component code.

**Integration** touches three files only: `wordSchema.ts` (schema confirmation), `AddWordModal.tsx` (nested array + enrichment), and `EditWordModal.tsx` (nested array + collapsible card + enrichment). No other files are expected to change.

## Schema and Validation {#schema-and-validation}

`wordSchema.ts` must define `grammar_patterns` inside `senseSchema` as:

```ts
grammar_patterns: z.array(grammarPatternSchema).min(1)
```

If this shape is already present, no code change is needed — the milestone is a confirmation step. Both modals derive their form types from `WordFormValues` (inferred from `wordSchema`), so any update here propagates automatically to both components without divergence.

The Zod `min(1)` mirrors the Pydantic `min_length=1` constraint on the backend, surfacing validation errors at the form layer before the request is sent. The UI must additionally disable the Remove button when `fields.length === 1` to give clear, immediate feedback rather than waiting for form submission.

## Nested Field Arrays {#nested-field-arrays}

Both modals already call `useFieldArray` for the top-level `senses` list. Grammar patterns require a **nested** call keyed to each sense's index:

```
name: `senses.${senseIndex}.grammar_patterns`
```

The `GrammarPatternFields` sub-component encapsulates this call and renders the preposition + case inputs, the Add button, and the Remove button (disabled at `fields.length === 1`). The parent sense loop passes `{ senseIndex, control, errors }` as props; the sub-component owns nothing outside those props.

For `EditWordModal`, the Grammar Patterns section is wrapped in a collapsible card. If per-sense collapse state for grammar patterns is tracked independently, the lowest-risk approach is a `grammarPatternsCollapsed: boolean[]` array synced via the same `useEffect` pattern already used for `sensesCollapsed` — triggering on `fields.length` changes to handle append, remove, and Re-enrich reset uniformly.

## Enrichment Mapping {#enrichment-mapping}

The enrichment flow calls `reset()` with the payload returned by `POST /words/enrich`. `WordEnrichment` (defined in `word.ts`) already includes `senses: Sense[]`, and each `Sense` carries a `grammar_patterns` array. If `reset()` is called with the raw enriched payload, all grammar patterns should populate without any mapping change.

The audit task is to confirm the `onEnrich` handler in both modals does **not** truncate `grammar_patterns` to the first element before passing to `reset()`. If truncation is found, the fix is straightforward — pass the full array. This is a read-and-verify step, not a redesign.

---

## Tech Stack {#tech-stack}

- **Next.js (v16)**: Existing frontend framework; all changes are React component additions within the existing app structure.
- **react-hook-form `useFieldArray`**: Already used for the sense-level field array; extended here to nested grammar-pattern arrays per sense using the same API surface.
- **Zod (`z.array().min()`)**: Already used for form validation via `@hookform/resolvers`; the `grammar_patterns` shape is confirmed or updated in `wordSchema.ts`.
- **PydanticAI (backend)**: No changes; included for reference as the source of enriched `grammar_patterns` data returned by the enrichment endpoint.

## Effort Estimations {#effort-estimations}

Total estimated effort: **{N} sessions**.

| Milestone                   | Description                                                                                                                                                    | Est. effort | GitHub Issue |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- | :----------- |
| M1 — Schema & Types         | Audit and confirm or update `wordSchema.ts` `grammar_patterns` list shape; verify `word.ts` types align with the expected list                                 | {N}         | #{issue}     |
| M2 — Nested Field Arrays    | Implement `GrammarPatternFields` sub-component; wire nested `useFieldArray` in `AddWordModal` and `EditWordModal`; add Add/Remove controls; add collapsible card in `EditWordModal` | {N}         | #{issue}     |
| M3 — Enrichment Audit       | Verify `onEnrich` / `reset()` mapping in both modals propagates all grammar patterns per sense; fix if truncated                                               | {N}         | #{issue}     |

### Recommended Order

1. M1 — Schema & Types (establish the type contract before touching component code)
2. M2 — Nested Field Arrays (core UI work; depends on M1 types being stable)
3. M3 — Enrichment Audit (can be done independently but benefits from M2 being in place for end-to-end verification)

---

# **FAQs** {#faqs}

**Q: Why extract grammar patterns into a sub-component instead of keeping everything inline in the sense loop?**

A: React Hook Form's `useFieldArray` must be called unconditionally from a React component body. Calling it inside `.map()` violates the Rules of Hooks and produces runtime errors. A `GrammarPatternFields` sub-component is the standard idiomatic pattern — it keeps each sense's field array isolated, prevents index collisions between senses, and makes the parent sense loop easier to read.

**Q: Why is the Review Area out of scope?**

A: `SenseCard.tsx` is a read-only flashcard renderer, not a form. Surfacing multiple grammar patterns there is a display concern that can be addressed independently — it requires no shared state, no `useFieldArray`, and no schema changes. Bundling it here would expand scope without benefiting the core editing flow.

**Q: What happens if the enrichment endpoint returns zero grammar patterns for a sense?**

A: This cannot happen — the backend enforces `min_length=1` at the Pydantic layer (HTTP 422 on violation). Even if it did, the Zod `min(1)` validation would surface a form error before submission, and the Remove button is disabled at one row so no manual interaction can reach zero.

**Q: Why collapse the entire Grammar Patterns section rather than individual rows?**

A: Grammar pattern rows are short (two fields each). Collapsing individual rows would give no meaningful UX benefit and would require additional per-row state. A section-level collapsible card matches the existing Verb Morphology pattern and is the minimum addition that keeps visual noise low in a long Edit modal.

**Q: Terminology?**

A:
- **RHF** → React Hook Form — the form state management library used throughout the frontend.
- **Sense** → a single semantic meaning of a German word, carrying its own grammar patterns and example sentences.
- **Grammar Pattern** → a (preposition, grammatical case) pair describing how a sense governs its complements; preposition is nullable (meaning no preposition is required).

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question                                                                                                                                                           | Likelihood | Mitigation / Answer                                                                                                                           |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| Nested `useFieldArray` name path error — incorrect `` senses.${i}.grammar_patterns.${j}.field `` path silently produces `undefined` values with no runtime error          | Medium     | Extract into `GrammarPatternFields` sub-component; smoke-test by creating a word with two grammar patterns and inspecting the saved payload    |
| Enrichment truncation — `onEnrich` handler passes only `grammar_patterns[0]` per sense to `reset()`                                                                       | Medium     | Audit `onEnrich` in both modals before writing any component code (M3); the fix is a one-line correction if truncation is found               |
| Collapse state desync — `grammarPatternsCollapsed` array out of sync with `useFieldArray` `fields` after append, remove, or Re-enrich reset                               | Low        | Reuse the exact `useEffect` pattern already in `EditWordModal` for `sensesCollapsed`; sync on `fields.length` changes                         |
| Grammar pattern edits lost on Re-enrich — clicking Re-enrich calls `reset()` which overwrites all manual edits including grammar patterns                                 | Low        | This is existing, intentional behaviour for all sense data; no special handling needed; document it in the UI if user confusion arises         |

## References {#references}

- [React Hook Form — `useFieldArray`](https://react-hook-form.com/docs/usefieldarray)
- [8-Multiple-Prepositions Notion page](https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def)
- [Milestone: 8-multiple-prepositions](https://github.com/Volscente/vademecum-germanicum/milestone/10)
