# [RFC] Word Review Feature — Vademecum Germanicum

| Author              | Simone Porreca                                                                                              |
| :------------------ | :---------------------------------------------------------------------------------------------------------- |
| **Project**         | Vademecum Germanicum                                                                                        |
| **RFC status**      | Draft                                                                                                       |
| **Review deadline** | 2026-07-31                                                                                                  |
| **Notion page**     | [5 - Review Feature](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11)              |
| **GitHub repo**     | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)                         |
| **Milestone**       | [Milestone: 5-review-feature](https://github.com/Volscente/vademecum-germanicum/milestone/7) |

### Timeline

| Date       | Status | Note |
| :--------- | :----- | :--- |
| 2026-05-22 | Draft  |      |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Word Review Feature](#word-review-feature)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The Vademecum Germanicum currently operates as a passive Word Database: users can log words and their contextual "Senses," but there is no active mechanism to practice or review them. Without a dedicated learning loop, the application functions as a digital dictionary rather than a vocabulary-retention tool, limiting its value for users actively working to master German. This RFC introduces a dual-area interface — a **Learning Area** for browsing and queuing senses, and a **Review Area** for sequential flashcard-style practice — completing the core study cycle. For full context, see the [Notion initiative page](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11).

## Objectives {#objectives}

- **Extend the data model**: Add `difficulty_level` and `last_reviewed_at` fields to the `Sense` entity in PostgreSQL, exposing them through the existing FastAPI REST API with a dedicated review-update endpoint.
- **Build the Learning Area**: Deliver a flat Senses Table view (accessible via an area toggle) that aggregates all senses across all words and displays a dynamically computed "To Review" badge derived from each sense's difficulty level and recency.
- **Build the Review Cart**: Enable multi-selection of sense rows to build an ephemeral session queue, and provide a trigger button to enter the Review Area once the desired pile is assembled.
- **Build the Review Area**: Implement a sequential, single-card review engine displaying collapsible Sense Cards with conditional Verb Morphology rendering; Difficulty Level buttons (Easy / Medium / Hard / Very Hard) simultaneously update the database and advance the session.
- **Close the review loop**: Detect session completion and render a "Review Completed" screen that routes the user back to either the Vocabulary Area or the Learning Area.

## Scope {#scope}

**In-Scope:**

- Interface toggle switch between Word Table (Vocabulary Area) and Senses Table (Learning Area)
- Senses Table view aggregating all senses across all words
- Metadata tracking per sense: Difficulty Level, Last Time Reviewed, and "To Review" badge calculation
- Multi-select functionality for Senses rows to build a "Review Cart"
- Review Area interface with a sequential, single-card layout ("Sense Card")
- Collapsible sections within the Sense Card (Word Information, Verb Morphology, Sense Information)
- Conditional rendering for Verb Morphology based on word category
- Interactive Difficulty Level buttons (Easy, Medium, Hard, Very Hard) to update sense metadata
- Animated transitions between Sense Cards during a review session
- Review completion screen with navigation routing back to Vocabulary or Learning areas

**Out-of-Scope:**

- **Advanced Spaced Repetition Algorithms (SRS)**: The initial version will use basic time/difficulty calculations for the badge, omitting full SuperMemo-style algorithms for a future phase.
- **Audio pronunciation playback**: Building audio assets or text-to-speech features for the Review Area will be handled in a later initiative.

**Constraints:**

- Modifying fields or ratings inside the Review Area must strictly preserve existing word relationships and context in the main database.
- Transitions between cards in the Review Area must feel instantaneous to maintain a rapid flashcard study rhythm.

---

# **Word Review Feature** {#word-review-feature}

## Approach Overview {#approach-overview}

The feature is structured around three distinct interface areas — Vocabulary, Learning, and Review — managed entirely as React state in the existing `page.tsx` root component, consistent with the current single-page architecture. An **Area Toggle** switch transitions between the Vocabulary Area (the existing `WordTable`) and the new Learning Area (a `SensesTable`). When the user triggers a review session from the Learning Area, the entire content pane is replaced by a full-canvas `ReviewArea` component; returning from the Review Area restores the previous area. No Next.js router changes are required.

The proposal's stated approach — dual-mode view, Review Cart, sequential flashcard review, dynamic Verb Morphology rendering — is adopted in full. The one design refinement over the stated direction is the explicit choice to manage all view-switching through React state rather than URL routing. URL-based routing was considered but rejected: the existing codebase has no router integration, the Review Area is inherently ephemeral (the cart is session-only), and state-driven switching avoids promoting the cart-state persistence problem into an architectural requirement.

### Integration {#integration}

The Learning Area consumes a new `GET /senses/` endpoint that returns a flat list of all senses enriched with their parent word's key fields (`word`, `translation`, `gender`, `category`). This avoids complex frontend joins while staying consistent with the backend's existing pattern of embedding related data in responses. Review metadata updates are handled by a new `PUT /senses/{sense_id}/review` endpoint that accepts a `difficulty_level` string, writes the chosen difficulty, and stamps `last_reviewed_at` with the server time — keeping timestamp authority on the backend. The `Sense` ORM model in `models.py` gains two new columns: `difficulty_level` (a new `DifficultyLevelEnum` following the same pattern as `GenderEnum` and `CategoryEnum`) and `last_reviewed_at` (nullable `TIMESTAMP`). Because the project has no Alembic migration toolchain, a manual SQL migration script must be authored alongside the backend code changes.

The "To Review" badge is computed purely on the frontend using a fixed time-threshold lookup keyed on difficulty level: Very Hard → 0 days (always show), Hard → 1 day, Medium → 3 days, Easy → 7 days. A sense with `last_reviewed_at = null` (never reviewed) always shows the badge. This keeps the badge logic close to the display layer where it is easiest to adjust, and avoids polluting the backend API with a derived boolean field.

## M1 — Database schema updates and "To Review" badge logic {#m1}

Add `difficulty_level` (new `DifficultyLevelEnum`: Easy, Medium, Hard, VeryHard; default Medium) and `last_reviewed_at` (nullable `TIMESTAMP`) columns to the `Sense` ORM model in `models.py`. Author a SQL migration script (`ALTER TABLE senses ADD COLUMN ...`) for manual execution against the running PostgreSQL container. Update `SenseRead` in `schemas.py` to expose both new fields. Add a `SenseReviewUpdate` Pydantic schema (`difficulty_level: str`). Implement `PUT /senses/{sense_id}/review` in `main.py`: load the sense, validate the difficulty value against the enum, set `last_reviewed_at = datetime.utcnow()`, persist, and return the updated `SenseRead`. Implement `GET /senses/` in `main.py`: query all senses joined with their parent word, return `list[SenseWithWordRead]` (new response schema embedding `word`, `translation`, `gender`, `category` from the parent). Extend the `Sense` TypeScript interface in `src/types/word.ts` with `difficulty_level` and `last_reviewed_at`. Implement a `toReview(sense: SenseWithWord): boolean` utility (threshold lookup) in a new `src/lib/reviewUtils.ts` file. Add `getSenses()` and `updateSenseReview(senseId, difficultyLevel)` functions to `src/lib/api.ts`.

## M2 — Learning Area UI: Senses Table and Review Cart multi-selection {#m2}

Introduce `area: "vocabulary" | "learning" | "review"` state to `page.tsx`. Add an `AreaToggle` component that switches between `"vocabulary"` and `"learning"`. When `area === "learning"`, render a new `SensesTable` component in place of `WordTable`. `SensesTable` fetches from `GET /senses/` and renders a table with columns for Word, Translation, Category, Difficulty Level, Last Reviewed, and a "To Review" badge (computed by `toReview`). Multi-select is implemented with a `selectedSenseIds: Set<number>` state; each row has a checkbox. A "Start Review" button (shown when `selectedSenseIds.size > 0`) sets `reviewQueue` state to the ordered array of selected senses and transitions `area` to `"review"`.

## M3 — Review Area UI: Sense Card layout with collapsible sections and conditional verb logic {#m3}

Build a `ReviewArea` component that receives `reviewQueue: SenseWithWord[]` and navigation callbacks. It renders the current card as a `SenseCard` component. `SenseCard` contains three collapsible sections using the CSS-only `max-h` toggle pattern already established in `EditWordModal`:

- **Word Information** (word text, translation, gender, category, plural form)
- **Verb Morphology** (auxiliary verb + principal forms — omitted entirely when `category !== "verb"`)
- **Sense Information** (meaning summary, register, grammar patterns, example sentences)

Below the card, four Difficulty Level buttons (Easy, Medium, Hard, Very Hard) are rendered using `lucide-react` icons or styled badges consistent with the existing `forest-*` Tailwind palette.

## M4 — Review workflow: card transitions, difficulty updates, and completion screen {#m4}

Clicking a Difficulty Level button fires `updateSenseReview(senseId, difficultyLevel)` (PUT request), then advances the `currentIndex` pointer. The card exit/enter is animated with a CSS transition (opacity + `translate-x`) driven by a brief `isTransitioning` state boolean toggled on click and cleared after the animation frame. When `currentIndex === reviewQueue.length`, `ReviewArea` renders a `ReviewCompleteScreen` sub-component with two buttons: *Return to Vocabulary Area* (sets `area = "vocabulary"`) and *Return to Learning Area* (sets `area = "learning"`). Cart loss on browser refresh is accepted for v1.

## Tech Stack {#tech-stack}

- **FastAPI**: Hosts the two new REST endpoints (`GET /senses/` and `PUT /senses/{sense_id}/review`); handles the SQLAlchemy session lifecycle and Pydantic schema validation for `SenseReviewUpdate` and `SenseWithWordRead`.
- **SQLAlchemy**: Extends the existing `Sense` ORM model with `difficulty_level` and `last_reviewed_at`; the new `DifficultyLevelEnum` follows the same pattern as the existing `GenderEnum` and `CategoryEnum`.
- **Next.js / React (v19)**: All view-switching logic lives in `page.tsx` as React state; no new routing layer is introduced, keeping the architecture consistent with the existing single-page approach.
- **Tailwind CSS (v4)**: Card collapse animations and Difficulty Level button styles reuse the existing `max-h` + `overflow-hidden` toggle and `forest-*` palette patterns established in `EditWordModal`.
- **lucide-react**: Icons for Difficulty Level buttons and the Area Toggle switch, consistent with existing usage throughout the application.

## Effort Estimations {#effort-estimations}

Total estimated effort: **{N} sessions**.

| Milestone | Description | Est. effort | GitHub Issue |
| :-------- | :---------- | :---------- | :----------- |
| M1 — Database schema updates and badge logic | New Sense columns, SQL migration script, backend endpoints (`GET /senses/`, `PUT /senses/{id}/review`), frontend types and API utilities, `reviewUtils.ts` | {N} | #{issue} |
| M2 — Learning Area UI | `AreaToggle`, `SensesTable`, multi-select state, Review Cart trigger | {N} | #{issue} |
| M3 — Review Area UI | `ReviewArea`, `SenseCard` with collapsible/conditional sections, Difficulty buttons | {N} | #{issue} |
| M4 — Review workflow | Card transitions, `updateSenseReview` calls, `ReviewCompleteScreen` and area routing | {N} | #{issue} |

### Recommended Order

1. M1 — Database schema updates (foundational: all UI work depends on the new API fields and types)
2. M2 — Learning Area UI (depends on M1 for sense data; delivers the cart entry point consumed by M4)
3. M3 — Review Area UI (depends on M2's cart shape; can be built against static mock data)
4. M4 — Review workflow (wires together M2's cart trigger, M3's layout, and the API call from M1)

---

# **FAQs** {#faqs}

**Q: Why manage view switching with React state rather than Next.js routes?**

A: The existing application has no router integration — all state lives in `page.tsx`. Adding URL routing would require serialising the Review Cart into query params or browser history, introducing complexity that isn't justified for an ephemeral session feature. The Review Area is intentionally transient; state-driven switching keeps it that way and avoids the cart-state persistence problem being promoted to an architectural requirement.

**Q: Why is the "To Review" badge computed on the frontend rather than returned by the backend?**

A: The badge is a pure function of `difficulty_level` and `last_reviewed_at` using a fixed time-threshold table. Computing it on the frontend keeps the backend API clean (no derived boolean that a future SRS algorithm will need to change), allows instant UI updates after a review without a re-fetch, and is trivially adjustable without a backend deploy.

**Q: What happens to the Review Cart if the user refreshes mid-session?**

A: The cart is stored in React state only; a refresh clears it. This is an accepted v1 limitation (see Risks). The user returns to the Learning Area and re-selects their senses. Local storage or backend session persistence is explicitly deferred to a future phase.

**Q: How is Verb Morphology conditionally hidden in the Sense Card?**

A: The `SenseCard` receives the parent word's `category` field via the `SenseWithWordRead` response shape. If `category !== "verb"`, the Verb Morphology section is not rendered at all — matching the conditional rendering pattern already established in `AddWordModal` and `EditWordModal`, where auxiliary verb and principal form inputs appear only when category is verb.

**Q: Terminology?**

A:

- **SRS** → Spaced Repetition System: an algorithm (e.g., SuperMemo SM-2) that schedules reviews based on recall difficulty. The v1 badge heuristic is a simplified approximation, not a full SRS implementation.
- **Sense** → a single contextual usage entry attached to a Word (e.g., one Word may carry multiple Senses for different grammatical or semantic contexts).
- **Review Cart** → the ephemeral, session-scoped ordered list of Sense IDs selected by the user in the Learning Area before entering the Review Area.

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question | Likelihood | Mitigation / Answer |
| :-------------- | :--------- | :------------------ |
| **Badge heuristic thresholds are wrong for real study habits** — the proposed intervals (Easy = 7 d, Medium = 3 d, Hard = 1 d, Very Hard = 0 d) are arbitrary and may not match actual retention curves | Medium | Isolate thresholds in a single `REVIEW_THRESHOLDS` constant in `reviewUtils.ts` so they can be tuned without touching component code; revisit after a few weeks of actual use |
| **Cart state lost on browser refresh** — the Review Cart lives in React state with no persistence layer | High (frequency) | Accepted for v1; surface clearly in the UI (e.g., a tooltip on the Start Review button). Local storage persistence is a named future enhancement. |
| **Manual DB migration risk** — without Alembic, the SQL `ALTER TABLE` script must be run manually against the live PostgreSQL container; skipping or mis-ordering it against a fresh container will cause startup errors or silent `null` reads | Medium | Version and commit the migration script alongside the backend code change; add a `just run_migration` recipe to the `justfile` to reduce operator error |
| **SenseCard layout complexity** — three collapsible sections plus conditional Verb Morphology adds non-trivial state inside the card; the `max-h` CSS-only toggle in `EditWordModal` can glitch on sections whose content height changes dynamically (e.g., expanding grammar pattern lists) | Low–Medium | Reuse the established `max-h` + `overflow-hidden` Tailwind pattern from `EditWordModal` exactly; validate manually for verb vs. non-verb card variants with varying numbers of grammar patterns and example sentences |

## References {#references}

- [5 - Review Feature — Notion](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11)
- [Volscente/vademecum-germanicum — GitHub](https://github.com/Volscente/vademecum-germanicum)
