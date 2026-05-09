# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
