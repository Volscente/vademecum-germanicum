---
title: "Add Multiple Prepositions"
project: "Vademecum Germanicum"
author: "Simone Porreca"
deadline: "2026-06-07"
notion-page: "https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def"
github-repo: "https://github.com/Volscente/vademecum-germanicum"
milestone: [8-multiple-prepositions](https://github.com/Volscente/vademecum-germanicum/milestone/10)
tech-stack:
  - "Next.js"
  - "PydanticAI"
scope-in:
  - "Vocabulary Area"
  - "Review Area"
scope-out:
  - "Vocabulary Area"
  - "Review Area"
milestones:
  - ""
context-paths:
  - "frontend/README.md"
  - "backend/README.md"
---

## Problem

The **Grammar Patterns** section inside a Sense Card currently renders only a single row — one preposition and one grammatical case. In German, a single semantic meaning of a verb, adjective, or noun can combine with multiple prepositions and cases depending on context (e.g. *warten auf + Akk.* and *warten mit + Dat.*). The rigid single-row constraint prevents users from capturing complete and linguistically accurate data in their vocabulary logs.

## Approach direction

This is a **frontend-only change**. The backend already supports multiple grammar patterns per sense: `SenseCreate` accepts `grammar_patterns: list[GrammarPatternCreate]` (min 1), and the LLM enrichment endpoint already returns a `grammar_patterns` list per sense. The gap is entirely in the UI layer.

The approach is to:

1. Replace the single-row Grammar Patterns input in `AddWordModal.tsx` and `EditWordModal.tsx` with a **nested `useFieldArray`** (sense-level field array already exists; grammar patterns need their own inner field array per sense).
2. Add **Add / Remove** controls for grammar pattern rows, preserving the existing `grammarPatternSchema` validation (preposition nullable, case required).
3. Wrap the Grammar Patterns section in a **collapsible card** using the same CSS-only `max-h` toggle pattern already used for Verb Morphology and Sense sections in `EditWordModal.tsx` and `SenseCard.tsx`.
4. Verify the enrichment `onEnrich` flow maps **all** grammar patterns returned per sense, not just the first.

No changes to `backend/`, `wordSchema.ts` (beyond confirming the list shape is already correct), `api.ts`, or `word.ts` are expected.

## Success criteria

- A user can add more than one Grammar Pattern row per Sense Card in both `AddWordModal` and `EditWordModal`.
- A user can remove any Grammar Pattern row (the UI prevents removal of the last row, matching the backend min-1 constraint).
- The Grammar Patterns section is collapsible via a header click, matching the visual pattern of the Verb Morphology and Sense sections.
- After clicking **Enrich**, all grammar patterns returned by the LLM are pre-populated (not just the first one per sense).
- The existing Zod validation and backend HTTP 422 guard continue to hold (at least one grammar pattern per sense).

## Constraints

- Every Sense must retain at least one Grammar Pattern — this is enforced at the Pydantic layer (`HTTP 422`) and must also be enforced in the frontend Zod schema and UI controls.
- `wordSchema` in `wordSchema.ts` is the single source of truth for form validation; both `AddWordModal` and `EditWordModal` must use it without diverging.
- No backend schema changes, no new API endpoints, no Alembic migrations.
- No new external dependencies — `react-hook-form` `useFieldArray` and the existing Zod schemas cover the requirement.

## Desired tech

None beyond what is already in use.

## Integration context

- **`AddWordModal.tsx`** and **`EditWordModal.tsx`** are the primary surfaces to change. Both already use `useFieldArray` for senses; grammar patterns need a nested field array inside each sense iteration.
- **`wordSchema.ts`** (`grammarPatternSchema`, `senseSchema`) — confirm or adjust that `grammar_patterns` is typed as a list with `min(1)`.
- **`EditWordModal.tsx`** — the collapsible card pattern (CSS `max-h` toggle, header click handler, error badge on collapsed header) is already established for Verb Morphology and Sense sections; replicate it for Grammar Patterns.
- **`SenseCard.tsx`** — the read-only flashcard already has three collapsible sections; if Grammar Patterns are surfaced here in future, the same pattern applies.

## Known risks / concerns

- **Nested `useFieldArray`**: React Hook Form's nested arrays require careful index management. Each sense has its own grammar-pattern field array, so the `name` path must be `senses.{senseIndex}.grammar_patterns.{patternIndex}.field`. Incorrect paths silently produce undefined values.
- **Enrichment mapping**: The current `onEnrich` handler calls `reset()` with the full enriched payload. If the payload already carries a full `grammar_patterns` list per sense, no change is needed; but if the current mapping truncates to the first element, it must be corrected.
- **Collapse state sync**: `EditWordModal` already uses a `useEffect` to keep `sensesCollapsed` in sync with the field array. A similar sync may be needed for per-sense grammar-pattern collapse state if it is tracked independently.
