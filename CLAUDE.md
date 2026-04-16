# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

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
