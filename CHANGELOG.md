# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
