# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The project uses `just` as a task runner. All common workflows are defined in `justfile`.

### Development

```bash
just dev                  # Start full stack: PostgreSQL + backend (Docker) + frontend (localhost:3000)
just run_database         # Start only PostgreSQL container
just run_backend          # Build and start backend + DB via docker-compose
just run_backend_recreate # Force full rebuild of backend
just run_frontend         # Start Next.js dev server on port 3000
```

### Testing

```bash
just run_tests  # Run pytest inside Docker: docker-compose run --rm --build backend uv run --package backend pytest backend/tests
```

To run a single test:
```bash
docker-compose run --rm --build backend uv run --package backend pytest backend/tests/test_words.py::test_create_word_success
```

### Linting

```bash
cd frontend && npm run lint   # ESLint on frontend
```

### Stopping Services

```bash
just stop_backend   # Stop all docker-compose services
just stop_frontend  # Kill frontend dev server (port 3000)
just stop_database  # Stop PostgreSQL container
```

### Dependency Management

```bash
uv add --package backend <dep>   # Add backend Python dependency
cd frontend && npm install <dep>  # Add frontend JS dependency
```

## Architecture

This is a monorepo with a **FastAPI backend** and a **Next.js frontend**, coordinated via Docker Compose for local development.

### Request Flow

Frontend (Next.js, port 3000) → HTTP API calls → Backend (FastAPI, port 8000) → PostgreSQL (port 5432, container `vademecum_db`)

The backend has CORS configured to allow only `http://localhost:3000`.

### Backend (`/backend`)

- **Entry**: `backend/src/backend/main.py` — FastAPI app, all route definitions, CORS config
- **Models**: `backend/src/backend/models.py` — SQLAlchemy ORM (`Word` table with `GenderEnum` and `CategoryEnum`)
- **Schemas**: `backend/src/backend/schemas.py` — Pydantic schemas (`WordCreate`, `WordRead`, `WordUpdate`)
- **Database**: `backend/src/backend/database.py` — engine and session factory; tables created at startup via `SQLModel.metadata.create_all`

Tests use `TestClient` with per-test transaction rollback (see `backend/tests/fixtures/database_management.py`). The test DB session overrides the production `get_db` dependency via FastAPI's dependency injection.

The backend is packaged as a `uv` workspace member. The root `pyproject.toml` declares `members = ["backend"]`; dependencies are locked in the shared `uv.lock`.

### Frontend (`/frontend`)

- **Entry**: `frontend/src/app/page.tsx` — manages all state (words list, search term, modal open/close), fetches from backend, passes handlers to child components
- **Types**: `frontend/src/types/word.ts` — shared `Word` TypeScript interface
- **Validation**: `frontend/src/lib/wordSchema.ts` — Zod schema used by both `AddWordModal` and `EditWordModal` via React Hook Form

Styling uses Tailwind CSS v4 with a custom "forest" green color palette defined in the global CSS.

### Environment Variables

All credentials and connection strings live in `.env` (not committed). The backend uses `POSTGRES_HOST_DOCKER=db` when running in Docker and `POSTGRES_HOST_LOCAL=localhost` for direct local runs. The `justfile` loads `.env` automatically via `set dotenv-load`.

### Versioning & PR Conventions

Both `frontend/package.json` and `backend/pyproject.toml` track the version number and must be bumped together. Every PR requires a `CHANGELOG.md` entry. The PR template (`.github/pull_request_template.md`) enforces this checklist.
