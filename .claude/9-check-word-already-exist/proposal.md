---
title: "Check Word Already Exist"
project: "Vademecum Germanicum"
author: "Simone Porreca"
deadline: "2026-07-31"
notion-page: "https://app.notion.com/p/9-Check-word-already-existing-3925cc6c0f0780cb929ffeeee7632263"
github-repo: "https://github.com/Volscente/vademecum-germanicum"
milestone: [9-check-word-already-exist](https://github.com/Volscente/vademecum-germanicum/milestone/11)
tech-stack:
  - "Next.js 16 / TypeScript"
  - "React Hook Form + Zod"
  - "FastAPI"
  - "PostgreSQL"
scope-in:
  - "Real-time notification in AddWordModal when the typed word already exists in the vocabulary table"
  - "Block form submission when the entered word is a duplicate"
  - "Disable the Enrich button when the entered word already exists"
scope-out:
  - "Fuzzy / phonetic matching: only exact (case-insensitive) duplicate detection is required"
  - "Duplicate checking in EditWordModal: the initiative targets word creation only"
milestones:
  - "Backend duplicate-check support"
  - "Frontend real-time duplicate notification in AddWordModal"
  - "Block save and disable Enrich on duplicate"
context-paths:
  - "frontend/README.md"
  - "backend/README.md"
---

## Problem

The word creation flow in AddWordModal has no guard against entering a word that already exists in the vocabulary table. Users can submit duplicate entries without any warning, which pollutes the vocabulary list and may cause confusion in the learning and review areas. There is currently no client-side or server-side mechanism that notifies the user of an existing match before the save action is committed.

## Approach direction

Use a debounced lookup against the existing `GET /words/?search=` backend endpoint as the user types in the word field of AddWordModal, and surface a visible duplicate warning. If an exact match is found, disable both the save button and the Enrich button to prevent the duplicate from being persisted.

## Success criteria

- Typing a word that already exists in the vocabulary table surfaces an inline notification in AddWordModal without requiring form submission.
- The form cannot be submitted while a duplicate word is detected — the save action is blocked.
- The Enrich button is disabled when the entered word matches an existing entry.

## Constraints

- Duplicate detection must be exact and case-insensitive, consistent with the existing search behaviour on `GET /words/?search=`.
- The solution must not introduce a new backend endpoint if the existing search endpoint can satisfy the requirement.

## Integration context

AddWordModal already holds the word input field and is wired to the `wordSchema` Zod schema via React Hook Form. The backend `GET /words/?search=` endpoint performs case-insensitive substring search on the `word` column, making it a natural hook for the duplicate check. The SearchBar component demonstrates the established debounce pattern (300 ms default) that AddWordModal can reuse.

## Known risks / concerns

- `GET /words/?search=` does substring matching, not exact matching — the frontend must filter the response to confirm a full exact match rather than treating any result as a duplicate.
- A brief window exists between the debounce delay and form submission where a race condition could allow a duplicate to slip through; the backend `POST /words/` endpoint remains the authoritative last guard.
