# Word Review Feature — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [Milestone: 5-review-feature](https://github.com/Volscente/vademecum-germanicum/milestone/7)
**Notion page:** [5 - Review Feature](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11)
**Total estimated effort:** 5 FTE-days (1 FTE = 1 day)

---

## Overview

This initiative transforms Vademecum Germanicum from a passive word database into an active vocabulary-retention tool by introducing three interface areas — Vocabulary, Learning, and Review — managed as React state in `page.tsx`. The backend gains two new endpoints (`GET /senses/` and `PUT /senses/{id}/review`) and two new `Sense` columns (`difficulty_level`, `last_reviewed_at`); the frontend gains a Senses Table with multi-select cart, a sequential flashcard Review Area with collapsible Sense Cards, and a completion screen routing back to either area.

### Dependency Order

```txt
TASK-1 ──► TASK-2 ──► TASK-3 ──► TASK-4
```

---

## TASK-1 — Database Schema Updates and Badge Logic

**GitHub Issue:** [Data Layer](https://github.com/Volscente/vademecum-germanicum/issues/55)
**Effort estimate:** 1.5 FTE-days

### Scope

Extend the backend data model with two new `Sense` columns, author a manual SQL migration script, implement two new REST endpoints, update Pydantic schemas, extend the TypeScript `Sense` interface, and add frontend API utilities and the badge computation function.

### Goal

Deliver the complete data layer and API contract that all UI tasks depend on: the enriched sense payload (`SenseWithWordRead`), the review-update endpoint, and the `toReview` utility that drives the badge.

### Deliverables

- `backend/src/backend/models.py` — `DifficultyLevelEnum` (Easy, Medium, Hard, VeryHard) and `difficulty_level` + `last_reviewed_at` columns on `Sense`
- `backend/src/backend/schemas.py` — `SenseReviewUpdate` schema; `SenseWithWordRead` schema embedding parent word fields; updated `SenseRead` exposing new columns
- `backend/src/backend/main.py` — `GET /senses/` returning `list[SenseWithWordRead]`; `PUT /senses/{sense_id}/review` accepting `SenseReviewUpdate`, stamping `last_reviewed_at`, returning updated `SenseRead`
- `migrations/add_sense_review_columns.sql` — `ALTER TABLE` script for manual execution against the PostgreSQL container
- `justfile` — new `run_migration` recipe wrapping the SQL script execution
- `frontend/src/types/word.ts` — `difficulty_level` and `last_reviewed_at` added to `Sense`; new `SenseWithWord` interface
- `frontend/src/lib/reviewUtils.ts` — `toReview(sense: SenseWithWord): boolean` using a `REVIEW_THRESHOLDS` constant lookup
- `frontend/src/lib/api.ts` — `getSenses()` and `updateSenseReview(senseId, difficultyLevel)` functions

### Technical Overview

`DifficultyLevelEnum` follows the same SQLAlchemy pattern as `GenderEnum` and `CategoryEnum` in `models.py`. The `GET /senses/` query joins `Sense` with `Word` to embed `word`, `translation`, `gender`, and `category` into the response, avoiding frontend joins. `PUT /senses/{sense_id}/review` validates the incoming difficulty string against `DifficultyLevelEnum` and uses `datetime.utcnow()` for `last_reviewed_at`. The badge thresholds are: Very Hard → 0 days (always show), Hard → 1 day, Medium → 3 days, Easy → 7 days; `null` `last_reviewed_at` always returns `true`. No Alembic toolchain exists — the migration script must be run manually.

---

## TASK-2 — Learning Area UI: Senses Table and Review Cart

**GitHub Issue:** [Learning Area](https://github.com/Volscente/vademecum-germanicum/issues/56)
**Effort estimate:** 1 FTE-day

### Scope

Introduce `area` state to `page.tsx`, build the `AreaToggle` switch, implement the `SensesTable` component with multi-select checkboxes and the "Start Review" trigger button.

### Goal

Deliver the entry point into the review flow: users can switch from the Vocabulary Area to the Learning Area, browse all senses with their "To Review" badges, select a subset, and trigger the Review Area.

### Deliverables

- `frontend/src/app/page.tsx` — `area: "vocabulary" | "learning" | "review"` state; `reviewQueue: SenseWithWord[]` state; `selectedSenseIds: Set<number>` state; conditional rendering of `WordTable` vs `SensesTable` vs `ReviewArea`
- `frontend/src/components/AreaToggle.tsx` — toggle switch between `"vocabulary"` and `"learning"`
- `frontend/src/components/SensesTable.tsx` — table with columns: Word, Translation, Category, Difficulty Level, Last Reviewed, To Review badge; checkbox per row; "Start Review" button (visible when selection is non-empty)

### Technical Overview

`SensesTable` fetches from `getSenses()` on mount. The "To Review" badge is computed per row using `toReview()` from `reviewUtils.ts`. Clicking "Start Review" sets `reviewQueue` to the ordered array of selected `SenseWithWord` objects (preserving row order) and sets `area = "review"`. The `AreaToggle` lives above the table, styled consistently with the existing `forest-*` Tailwind palette.

---

## TASK-3 — Review Area UI: Sense Card Layout

**GitHub Issue:** [Review Area UI](https://github.com/Volscente/vademecum-germanicum/issues/57)
**Effort estimate:** 1.5 FTE-days

### Scope

Build the `ReviewArea` container and the `SenseCard` component with three collapsible sections, conditional Verb Morphology rendering, and the four Difficulty Level buttons.

### Goal

Deliver the visual shell of the review experience: a full-canvas card layout that renders any `SenseWithWord` correctly for both verb and non-verb categories, with collapsible sections and styled difficulty controls.

### Deliverables

- `frontend/src/components/ReviewArea.tsx` — receives `reviewQueue: SenseWithWord[]` and navigation callbacks; renders `SenseCard` for the current index
- `frontend/src/components/SenseCard.tsx` — three collapsible sections using `max-h` + `overflow-hidden` Tailwind toggle: Word Information, Verb Morphology (omitted when `category !== "verb"`), Sense Information; four Difficulty Level buttons (Easy, Medium, Hard, Very Hard) using `lucide-react` icons and `forest-*` palette

### Technical Overview

Collapsible sections follow the exact `max-h` CSS-only toggle pattern from `EditWordModal` — no JS height measurement, toggled by a boolean per-section. Verb Morphology section (auxiliary verb, principal forms) is conditionally rendered only when the parent word's `category === "verb"`, matching the pattern in `AddWordModal` and `EditWordModal`. Difficulty buttons are styled as badge-like controls; clicking them calls a callback passed from `ReviewArea` (the actual API call and index advance are wired in TASK-4).

---

## TASK-4 — Review Workflow: Transitions, API Updates, and Completion Screen

**GitHub Issue:** [Review Workflow](https://github.com/Volscente/vademecum-germanicum/issues/58)
**Effort estimate:** 1 FTE-day

### Scope

Wire the Difficulty Level buttons to the `updateSenseReview` API call and index advancement, implement the card-to-card CSS transition animation, and build the `ReviewCompleteScreen` with its navigation buttons.

### Goal

Complete the review loop: clicking a difficulty button persists the rating, animates the transition to the next card, and on exhaustion renders the completion screen that returns the user to either the Vocabulary or Learning Area.

### Deliverables

- `frontend/src/components/ReviewArea.tsx` — `currentIndex` state; `isTransitioning` boolean state toggling opacity + `translate-x` CSS classes; difficulty button handler: fires `updateSenseReview`, toggles `isTransitioning`, advances `currentIndex` after the animation frame; renders `ReviewCompleteScreen` when `currentIndex === reviewQueue.length`
- `frontend/src/components/ReviewCompleteScreen.tsx` — "Return to Vocabulary Area" button (sets `area = "vocabulary"`) and "Return to Learning Area" button (sets `area = "learning"`)

### Technical Overview

The transition animation uses a CSS opacity + `translate-x` class applied during `isTransitioning = true`, cleared with `requestAnimationFrame` or a short `setTimeout` (matching the established pattern in the codebase). The `updateSenseReview` PUT call is fire-and-forget from the UX perspective — the UI advances immediately without waiting for the response, accepting eventual consistency for latency. Cart state loss on browser refresh is an accepted v1 limitation with no mitigation in this task.

---

## GitHub Issues

### Milestone 1 — M1: Data Layer

**Tasks:** TASK-1
**Effort:** 1.5 FTE-days

#### Scope

All backend and frontend foundational work: ORM model extension, SQL migration script, two new REST endpoints, Pydantic schemas, TypeScript types, API client functions, and the badge utility.

#### Goal

A fully functional API layer exposing enriched sense data and the review-update endpoint, with the frontend type system and badge logic ready for UI consumption.

#### Deliverables

- `DifficultyLevelEnum` and new `Sense` columns in `models.py`
- `SenseWithWordRead` and `SenseReviewUpdate` schemas
- `GET /senses/` and `PUT /senses/{sense_id}/review` endpoints
- Manual SQL migration script with `just run_migration` recipe
- Updated `word.ts` types and new `reviewUtils.ts` with `toReview`
- `getSenses()` and `updateSenseReview()` in `api.ts`

---

### Milestone 2 — M2: Learning Area

**Tasks:** TASK-2
**Effort:** 1 FTE-day

#### Scope

Area state management in `page.tsx`, the `AreaToggle` component, the `SensesTable` with To Review badges and multi-select, and the Review Cart trigger.

#### Goal

Users can navigate to the Learning Area, see all senses with actionable "To Review" badges, select a subset, and initiate a review session.

#### Deliverables

- `area` and `reviewQueue` state in `page.tsx`
- `AreaToggle` component
- `SensesTable` with multi-select checkboxes and "Start Review" button

---

### Milestone 3 — M3: Review Area UI

**Tasks:** TASK-3
**Effort:** 1.5 FTE-days

#### Scope

`ReviewArea` container and `SenseCard` with collapsible Word Information, conditional Verb Morphology, and Sense Information sections, plus styled Difficulty Level buttons.

#### Goal

A fully rendered, visually correct Sense Card for any word category, with all interactive controls present (collapsed/expanded sections, difficulty buttons).

#### Deliverables

- `ReviewArea.tsx` component
- `SenseCard.tsx` with three collapsible sections and conditional Verb Morphology
- Four Difficulty Level buttons with `lucide-react` icons

---

### Milestone 4 — M4: Review Workflow

**Tasks:** TASK-4
**Effort:** 1 FTE-day

#### Scope

Difficulty button → API call → index advance chain, card transition animation, and `ReviewCompleteScreen` with area-routing buttons.

#### Goal

A complete, end-to-end review session: rate a sense, see an animated transition, exhaust the queue, and navigate back to the desired area.

#### Deliverables

- Difficulty button handler wired to `updateSenseReview` and `currentIndex` advancement
- CSS opacity + `translate-x` card transition animation
- `ReviewCompleteScreen.tsx` with Vocabulary and Learning Area navigation buttons
