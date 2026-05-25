---
title: "Add Sense Meaning in Learning Area"
project: "Vademecum Germanicum"
author: "Simone Porreca"
deadline: "2026-05-25"
notion-page: "https://www.notion.so/7-Add-Sense-Meaning-in-Learning-Area-3695cc6c0f0780be9eb9c0b0b7f57e3e"
github-repo: "https://github.com/Volscente/vademecum-germanicum"
milestone: [7-add-sense-meaning-learning-area](https://github.com/Volscente/vademecum-germanicum/milestone/9)
tech-stack:
  - "Next.js"
scope-in:
  - "Learning Area table"
scope-out:
  - "Vocabulary Area"
  - "Review Area"
milestones:
  - ""
context-paths:
  - "frontend/README.md"
---

## Problem

The Learning Area table does not have the column “Sense Meaning” with the overview of the Sense. This results in rows of the same word to be duplicated. Add the “Sense Meaning” and assign it a meaningful name (e.g., just “Sense”).

## Approach direction

Add a "Sense" column to `SensesTable.tsx` that displays the `meaning_summary` field already present on each `SenseWithWord` object returned by `getSenses()`. No backend or API changes are needed — the data is already available in the existing payload.

## Success criteria

- User can see the Sense (`meaning_summary`) in the Learning Area table as a dedicated "Sense" column
- The review process (multi-select, Start Review, card progression) remains unchanged

## Constraints

- No backend or API changes — the solution must rely solely on data already returned by `getSenses()` (`GET /senses/`)
- The `SensesTable` component must continue to satisfy its public interface: `<SensesTable onStartReview>`

## Desired tech

None beyond the existing stack (Next.js, Tailwind CSS v4, TypeScript).

## Integration context

The change is isolated to `src/components/SensesTable.tsx`. The `SenseWithWord` type (defined in `src/types/word.ts`) already carries `meaning_summary` via the embedded `Sense` fields, so no type changes are required. The column should be inserted between the word column and the To Review badge, matching the visual rhythm of the existing table.

## Known risks / concerns

- `meaning_summary` may be empty or `null` for older entries — the cell should render a graceful fallback (e.g. an em-dash or blank) rather than crash.
