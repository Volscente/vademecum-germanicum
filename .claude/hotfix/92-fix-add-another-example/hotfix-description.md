---
title: "Add Word form does not allow adding additional example sentences"
project: "vademecum-germanicum"
author: "Simone Porreca"
severity: "medium"      # critical | high | medium
affected-versions:
  - "v0.4.14"
github-issue: "92"
github-repo: "Volscente/vademecum-germanicum"
tech-stack:
  - "Next.js 16"
  - "React 19"
  - "TypeScript"
  - "react-hook-form"
  - "Zod"
  - "Tailwind CSS v4"
context-paths:
  - "frontend/README.md"
  - "frontend/src/components/AddWordModal.tsx"
  - "frontend/src/components/GrammarPatternFields.tsx"
  - "frontend/src/lib/wordSchema.ts"
  - "frontend/src/types/word.ts"
---

## Symptom

When creating a new word through the "Add Word" form, the user cannot add additional example sentences to a sense. The form offers no control to append another example, so the user cannot customise the example sentences beyond what is already present (e.g. what the AI enrichment pre-populated).

Additionally, the German and English parts of an example sentence are not easily identifiable in the UI.

## Root cause

Hypothesis (not yet verified against the code): `AddWordModal` has no add/remove controls for example sentences. Grammar patterns already have a dedicated nested `useFieldArray` sub-component (`GrammarPatternFields`) with Add/Remove controls, but `exampleSentenceSchema` has no equivalent UI component, so example sentences are rendered as a fixed set of fields.

## Fix approach

- Add a reusable sub-component for example sentences, modelled on `GrammarPatternFields` (nested `useFieldArray` per sense, rendered as a proper component and not inside a `.map()` callback).
- Provide an "Add Example Sentence" button and a per-row Remove control, so the user can add as many example sentences as they want.
- Label the German and English inputs of each example sentence clearly (e.g. visible "German" / "English" labels or distinct visual treatment) so the two parts are easy to tell apart.
- Keep `wordSchema` as the single source of truth for validation and initialise new rows consistently with the `ExampleSentence` interface and the backend contract.

## Verification steps

- Open the app (`just dev`), click "Add Word", and fill in a word.
- In a sense, click "Add Example Sentence" several times and confirm each click adds a new row with German and English inputs.
- Confirm the German and English inputs are visually and textually distinguishable in every row.
- Remove an added example sentence and confirm only that row disappears.
- Use "Enrich" and confirm the pre-populated example sentences are shown and further ones can still be added.
- Save the word and confirm all example sentences are persisted (reopen the word via `EditWordModal`).
- Run `cd frontend && npm run lint` and confirm no new errors.

## Scope

In scope:

- Adding/removing multiple example sentences per sense in the Add Word form.
- Making the German and English parts of each example sentence identifiable in the UI.

Out of scope:

- Backend changes: the sense graph already supports multiple example sentences, unless investigation proves otherwise.
- Redesign of the Edit Word form: separate initiative, unless it shares the component being changed.
- Drag-to-reorder example sentences: not implemented project-wide.

## Known risks

- Rendering the new component inside a `.map()` callback would break the Rules of Hooks, since it calls `useFieldArray` internally.
- Initialising new rows with the wrong shape (e.g. `undefined` instead of the expected empty/null values) could cause Zod validation or backend 422 errors.
- If the component is reused in `EditWordModal`, layout or collapse behaviour (`max-h` toggles) there could be affected.
- Enrichment `reset()` replaces the full sense payload, so user-added example sentences are lost if "Enrich" is clicked afterwards.
