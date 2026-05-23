# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.3] - 2026-05-23

### Added

- **Frontend**: New `ReviewCompleteScreen` React component — session-end screen with "Return to Vocabulary Area" and "Return to Learning Area" navigation buttons.

### Changed

- **Frontend**: `ReviewArea` updated with `currentIndex` and `isTransitioning` state to drive card progression; `onDifficultySelect` now calls `updateSenseReview` (fire-and-forget) and advances the card after a 150 ms opacity + `translate-x` CSS transition; progress counter reflects the current card index; `ReviewCompleteScreen` is rendered when the queue is exhausted; `onNavigate` prop is now consumed (was declared but unused).

## [0.4.2] - 2026-05-23

### Added

- **Backend**: `word_plural`, `auxiliary_verb`, `principal_forms` fields added to `SenseWithWordRead` Pydantic schema so verb morphology data is forwarded through the `GET /senses/` response.
- **Frontend**: `word_plural`, `auxiliary_verb`, `principal_forms` optional fields added to the `SenseWithWord` TypeScript interface in `word.ts`.
- **Frontend**: New `SenseCard` React component with three collapsible sections (Word Information, Verb Morphology, Sense Information); Verb Morphology rendered only when `category === "verb"`; four Difficulty Level buttons (Easy / Medium / Hard / Very Hard) using `ThumbsUp` / `Minus` / `TrendingDown` / `ThumbsDown` lucide-react icons and the `forest-*` palette.
- **Frontend**: New `ReviewArea` React component — full-canvas review session container; renders `SenseCard` for the first sense in the queue; displays a read-only "1 / N senses" progress counter; empty-queue fallback.

### Changed

- **Backend**: `read_senses` endpoint now passes `word_plural`, `auxiliary_verb`, `principal_forms` from the parent `Word` when constructing each `SenseWithWordRead` response item.
- **Frontend**: `page.tsx` — `area === "review"` placeholder replaced with `<ReviewArea reviewQueue={reviewQueue} onNavigate={...} />`; `ReviewArea` import added.

## [0.4.1] - 2026-05-23

### Added

- **Frontend**: New `AreaToggle` React component — pill-style toggle switch between Vocabulary and Learning areas, styled with the `forest-*` Tailwind palette; hidden when the Review Area is active.
- **Frontend**: New `SensesTable` React component — Learning Area table that fetches all senses from `GET /senses/`, renders To Review badges via `toReview()`, supports multi-select checkboxes with local state, and triggers the review session via `onStartReview`.

### Changed

- **Frontend**: `page.tsx` extended with `area` (`"vocabulary" | "learning" | "review"`) and `reviewQueue: SenseWithWord[]` state; `SearchBar` rendered only in Vocabulary Area; `AreaToggle` rendered above the content pane (hidden when `area === "review"`); content pane now conditionally renders `WordTable`, `SensesTable`, or a Review Area placeholder based on `area`.

## [0.4.0] - 2026-05-23

### Added

- **Backend**: `DifficultyLevelEnum` (`Easy`, `Medium`, `Hard`, `VeryHard`) in `models.py` following the same pattern as `GenderEnum` / `CategoryEnum`.
- **Backend**: `difficulty_level` (default `"Medium"`) and `last_reviewed_at` (nullable `TIMESTAMP`) columns on the `Sense` ORM model.
- **Backend**: `SenseReviewUpdate` Pydantic request schema and `SenseWithWordRead` response schema embedding parent word fields (`word`, `translation`, `gender`, `category`).
- **Backend**: `GET /senses/` endpoint returning a flat list of all senses with parent word fields embedded, using `selectinload` to avoid N+1 queries.
- **Backend**: `PUT /senses/{sense_id}/review` endpoint that validates `difficulty_level` against `DifficultyLevelEnum`, sets `last_reviewed_at = datetime.now(timezone.utc)`, and returns the updated `SenseRead`.
- **Infrastructure**: `migrations/add_sense_review_columns.sql` — idempotent `ALTER TABLE` script (`IF NOT EXISTS`) for adding the two new columns to the live `senses` table.
- **Infrastructure**: `run_migration` recipe in `justfile` for applying the SQL migration against the running PostgreSQL container (`just run_backend_recreate` first, then `just run_migration`).
- **Frontend**: `difficulty_level` and `last_reviewed_at` optional fields added to the `Sense` interface in `word.ts`.
- **Frontend**: New `SenseWithWord` interface in `word.ts` extending `Sense` with `word`, `translation`, `gender`, and `category` from the parent word.
- **Frontend**: New `reviewUtils.ts` module with `REVIEW_THRESHOLDS` constant and `toReview(sense: SenseWithWord): boolean` utility for computing the "To Review" badge.
- **Frontend**: `getSenses()` and `updateSenseReview()` API functions in `api.ts`.
- **Tests**: New `test_senses.py` suite covering `GET /senses/` response shape, `PUT /senses/{id}/review` success (200 + non-null timestamp + correct difficulty), invalid difficulty (422), and non-existent sense (404).

## [0.3.5] - 2026-05-10

### Added

- **Frontend**: "Collapse All" button in `EditWordModal`, placed just above the Verb Morphology card. A single click sets `verbMorphologyCollapsed = true` and maps all `sensesCollapsed` entries to `true`, condensing the entire modal to summary headers in one action.

## [0.3.4] - 2026-05-10

### Changed

- **Frontend**: `EditWordModal` Sense cards are now independently collapsible — click the section header to toggle expand/collapse. Collapsed header displays the Meaning Summary text (or "No summary yet" when empty) and a red error badge when the card contains a validation error. A `sensesCollapsed: boolean[]` state array, indexed parallel to `useFieldArray` `fields`, tracks per-card state; a `useEffect` keeps it in sync on append, remove, and Re-enrich reset. Fields remain mounted (CSS-only `max-height` toggle) so react-hook-form registration and validation are preserved in both states.

## [0.3.3] - 2026-05-10

### Changed

- **Frontend**: `EditWordModal` Verb Morphology card is now collapsible — click the section header to toggle expand/collapse. Collapsed header displays a real-time summary of the three principal forms (Infinitiv · Präteritum · Partizip II) or `"—"` when empty. A red error badge on the collapsed header surfaces `auxiliary_verb` / `principal_forms` validation errors without requiring the user to expand the card. Fields remain mounted in the DOM (CSS-only `max-height` toggle) so react-hook-form registration and validation are preserved in both states.

## [0.3.2] - 2026-05-09

### Added

- **Frontend**: `Sense`, `GrammarPattern`, `ExampleSentence` TypeScript interfaces in `word.ts` mirroring the new backend sense graph.
- **Frontend**: `grammarPatternSchema`, `exampleSentenceSchema`, `senseSchema` Zod schemas in `wordSchema.ts`; `wordSchema` extended with `auxiliary_verb`, `principal_forms`, and `senses` (min 1).
- **Frontend**: `updateWord(wordId, data)` API helper in `api.ts` calling `PUT /words/{id}`.

### Changed

- **Frontend**: `AddWordModal` updated to sense-based form — `example_sentences` textarea replaced by `useFieldArray`-driven senses section; `onEnrich` now uses `reset()` with the full enrichment payload; optional verb morphology inputs (`auxiliary_verb`, `principal_forms`) shown when `category === "verb"`.
- **Frontend**: `EditWordModal` rewritten as a full edit form — RHF + `useFieldArray` for senses, `useEffect` reset on word prop change, PUT submit, Re-enrich button, `onWordUpdated` callback; `isOpen` guard moved after all hook declarations.
- **Frontend**: `WordTable` "Meaning" column now displays `senses[0]?.meaning_summary ?? ''`; `onWordUpdated` prop added to `EditWordModal` and wired as `onRefresh`.
- **Frontend**: `Word` and `WordEnrichment` interfaces updated to sense-based structure — `Word` gains `auxiliary_verb`, `principal_forms`, `senses`; `WordEnrichment` drops old flat fields and gains `auxiliary_verb`, `principal_forms`, `senses`.

## [0.3.1] - 2026-05-09

### Changed

- **Backend**: `WordEnrichment` model in `enrichment.py` updated to sense-based structure — drops flat legacy fields (`prepositions`, `example_sentences`, `idiomatic_usages`); adds `auxiliary_verb`, `principal_forms`, and `senses: list[SenseCreate]` (min 1).
- **Backend**: `SYSTEM_PROMPT` in `enrichment.py` rewritten to instruct Gemini to produce the new nested sense array, including valid `register` and `case` enum values and a prohibition on empty `grammar_patterns` / `example_sentences` arrays.
- **Tests**: Enrichment test suite updated to the new `WordEnrichment` shape — fixture and assertions reflect nested `senses`; new `test_enrich_word_returns_sense_array` test added; enum serialisation test extended to cover `register` and `case` fields.

## [0.3.0] - 2026-05-09

### Added

- **Backend**: New ORM models `Sense`, `GrammarPattern`, `ExampleSentence` in `models.py`, forming a Word → Sense → GrammarPattern / ExampleSentence hierarchy.
- **Backend**: New enumerations `CaseEnum` (`Nominativ`, `Akkusativ`, `Dativ`, `Genitiv`) and `RegisterEnum` (`Formal`, `Colloquial`, `Neutral`, `Technical`) in `models.py`.
- **Backend**: New Pydantic schemas `SenseCreate`, `SenseRead`, `GrammarPatternCreate`, `GrammarPatternRead`, `ExampleSentenceCreate`, `ExampleSentenceRead` in `schemas.py`.
- **Backend**: `auxiliary_verb` and `principal_forms` (JSON) fields on the `Word` model and `WordBase` schema for verb morphology.
- **Backend**: `migration.sql` — manual SQL script to migrate the live `words` table (drops deprecated columns, adds verb morphology columns).
- **Tests**: New test suite in `test_words.py` covering multi-sense persistence, empty-list constraint enforcement (`senses`, `grammar_patterns`, `example_sentences`), sense replace on PUT, and sense preservation when `senses` is absent from PUT.

### Changed

- **Backend**: `POST /words/` now accepts and persists a nested sense graph (`senses: list[SenseCreate]`) in a single transaction.
- **Backend**: `GET /words/` uses `selectinload` to eager-load the full sense graph and avoid N+1 queries.
- **Backend**: `PUT /words/{id}` atomically replaces the sense list when `senses` is included in the request body; omitting `senses` leaves existing senses unchanged.
- **Backend**: `WordCreate`, `WordRead`, `WordUpdate` schemas extended with sense-family fields; deprecated flat-text fields (`prepositions`, `example_sentences`, `idiomatic_usages`) removed.
- **Tests**: `valid_word_payload` fixture updated to include a `senses` array; existing word tests updated for the new `WordRead` shape.

## [0.2.9] - 2026-05-07

### Changed

- **Frontend**: Added logo icon to the app header in `page.tsx` alongside the app name.
- **Frontend**: Standardised row padding from `py-4` to `py-3` across all `WordTable` cells for a tighter layout.
- **Frontend**: Changed `shadow-xl` to `shadow-sm` on `AddWordModal` and `EditWordModal` containers for a flatter appearance.
- **Frontend**: Standardised input and select border radius to `rounded-md` in `AddWordModal`.
- **Frontend**: Added missing `dark:focus:ring-forest-400` to the `example_sentences` textarea in `AddWordModal`.
- **Frontend**: Increased `EditWordModal` field row spacing from `space-y-2` to `space-y-3` for better readability.

## [0.2.8] - 2026-05-07

### Changed

- **Frontend**: Muted dark-mode colour palette across all components — shifted mid-range `forest-300`–`forest-500` accent text tokens one step lighter (toward `forest-100`/`forest-200`) to reduce neon-green saturation on dark backgrounds.
- **Frontend**: Added `dark:focus:ring-forest-400` to all form inputs in `AddWordModal` and `SearchBar` so focus rings match the muted dark-mode palette.

## [0.2.7] - 2026-05-04

### Added

- **Frontend**: "Enrich" button in `AddWordModal` that calls `POST /words/enrich` and pre-fills all form fields with LLM-generated metadata.
- **Frontend**: New `api.ts` module with `enrichWord` fetch wrapper for the enrichment endpoint.
- **Frontend**: UI inputs for `gender` (select), `category` (select), `word_plural` (text), and `example_sentences` (textarea) added to `AddWordModal`.
- **Frontend**: `WordEnrichment` TypeScript interface in `word.ts` matching the backend `WordEnrichment` schema.
- **Infrastructure**: `just empty_words` command to truncate the words table before applying breaking enum changes.
- **Tests**: `test_enrich_endpoint_serialises_enums_as_strings` — verifies gender and category are serialised as lowercase strings, not Python enum repr.

### Changed

- **Frontend**: `wordSchema.ts` category enum aligned with backend `CategoryEnum` — replaced `"preposition"` and `"other"` with `"pronoun"`.

## [0.2.6] - 2026-05-03

### Added

- **Backend**: New `POST /words/enrich` endpoint to enrich a German word with LLM-generated metadata (gender, translation, category, etc.).
- **Backend**: New `enrichment.py` module with `WordEnrichment` model and PydanticAI agent using native Google Gemini provider.
- **Backend**: `WordEnrichRequest` Pydantic schema for enrichment request validation.
- **Tests**: Enrichment test suite covering success, missing field, empty string, and agent error scenarios.

## [0.2.5] - 2026-04-03

### Added

- **Frontend**: New `SearchBar` React Component to create a search bar UI for searching words.

### Changed

- **Frontend**: Enhanced `page.tsx` with the search bar

## [0.2.4] - 2026-03-28

### Added

- **Tests**: Functional test suite `test_search_words_success` covering the search word logic.

### Changed

- **Backend**: Enhanced `read_words` Service with search capabilities by word and translation.

## [0.2.3] - 2026-03-14

### Added

- **Frontend**: New `EditWordModal` React Component to create a UI for editing and deleting words.

### Changed

- **Frontend**: Add clickable words for editing/deleting in `WordTable`.
- **Frontend**: Add dark mode and green color palette.

## [0.2.2] - 2026-03-09

### Added

- **Frontend**: New `AddWordModal` React Component to create a UI for adding words into the table.
- **Frontend**: New `wordSchema` Zod object to perform input validation on `AddWordModal` React Component.

### Changed

- **Frontend**: Enhanced `page.tsx` with `AddWordModal` React Component.

## [0.2.1] - 2026-03-05

### Added

- **Backend**: New `DELETE /words/{word_id}` endpoint in `main.py` to support word deletion.
- **Tests**: Functional test suite `test_update_word_not_found` covering the update exception logic.
- **Tests**: Functional test suite `test_delete_word_success` covering the deletion logic.
- **Tests**: Functional test suite `test_delete_word_not_found` covering the deletion exception logic.

## [0.2.0] - 2026-03-02

### Added

- **Backend**: New `PUT /words/{word_id}` endpoint in `main.py` to support word updates.
- **Backend**: `WordUpdate` Pydantic schema to allow partial updates of vocabulary entries.
- **Tests**: Functional test suite `test_update_word_success` covering the update logic.

### Changed

- **Backend**: Enhanced `update_word` service logic to prevent null or empty strings for core fields (`word`, `translation`) while allowing partial updates of other attributes.

## [0.1.1] - 2026-02-26

### Added

- **Infrastructure**: Dockerization of the backend using `Dockerfile` and `docker-compose` for local development.
- **Backend**: Core API architecture including SQLAlchemy `models`, `database` session management, and Pydantic `schemas`.
- **Backend**: Initial test suite in the `tests` module.
- **Frontend**: New Next.js workspace with a modular `WordTable` React component.
- **Frontend**: Type definitions for backend connectivity in `word.ts`.

### Changed

- **Frontend**: Refactored `page.tsx` to integrate with the backend API and display data in the new table component.
