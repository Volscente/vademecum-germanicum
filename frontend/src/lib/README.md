# frontend/src/lib

Shared utility modules for the Vademecum Germanicum frontend. Contains the typed API client and domain-specific helpers consumed by React components in `src/app/`.

## Key components

- **api.ts** — fetch wrappers for all backend REST endpoints; typed against the interfaces in `src/types/word.ts`
- **wordSchema.ts** — Zod validation schema for the word creation / edit form, used by React Hook Form
- **reviewUtils.ts** — pure utility for computing whether a sense is due for review based on difficulty level and recency

## Public interfaces

- `enrichWord(word)` — `POST /words/enrich`; returns `WordEnrichment`
- `updateWord(wordId, payload)` — `PUT /words/{wordId}`; returns updated `Word`
- `getSenses()` — `GET /senses/`; returns `SenseWithWord[]`
- `updateSenseReview(senseId, difficultyLevel)` — `PUT /senses/{senseId}/review`; returns updated `Sense`
- `toReview(sense)` — returns `true` if the sense is due for review based on `REVIEW_THRESHOLDS`

## External dependencies

- **Zod** — schema validation in `wordSchema.ts`

## Constraints / invariants

- `REVIEW_THRESHOLDS` in `reviewUtils.ts` is the single source of truth for review cadence: `{ Easy: 7, Medium: 3, Hard: 1, VeryHard: 0 }` (days). `VeryHard` always returns `true`; `null` `last_reviewed_at` always returns `true`.
- All `fetch` calls in `api.ts` target `http://localhost:8000` — local development only.

## Out of scope

- **State management** — no global store; all state lives in `page.tsx` or component-local hooks.
- **Authentication** — no auth headers or token handling.

---

## Changelog

### 2026-05-23

- Created `reviewUtils.ts` with `REVIEW_THRESHOLDS` constant and `toReview(sense: SenseWithWord): boolean`.
- Added `getSenses()` and `updateSenseReview()` API functions to `api.ts`.
