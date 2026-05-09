# Backend

## Purpose

A FastAPI application that serves as the data and AI layer for Vademecum Germanicum. It persists German vocabulary words in PostgreSQL, exposes a REST API consumed by the Next.js frontend, and delegates word enrichment (gender, declensions, examples) to a Google Gemini LLM via PydanticAI.

## Key components

- **`src/backend/main.py`** — FastAPI app entry point; defines all routes, CORS middleware, and creates DB tables on startup
- **`src/backend/models.py`** — SQLAlchemy ORM models: `Word`, `Sense`, `GrammarPattern`, `ExampleSentence`; plus enumerations `GenderEnum`, `CategoryEnum`, `CaseEnum`, `RegisterEnum`
- **`src/backend/schemas.py`** — Pydantic schemas for request/response validation: `WordCreate`, `WordRead`, `WordUpdate`, `SenseCreate`, `SenseRead`, `GrammarPatternCreate/Read`, `ExampleSentenceCreate/Read`, `WordEnrichRequest`
- **`src/backend/database.py`** — SQLAlchemy engine and session factory; exposes `get_db` FastAPI dependency
- **`src/backend/enrichment.py`** — LLM enrichment logic; defines `WordEnrichment` output model and `enrich_word` async function using PydanticAI with Google Gemini

## Public interfaces

**REST endpoints:**

- `GET /` — health check; returns a welcome message
- `POST /words/enrich` — accepts `{"word": str}`, returns `WordEnrichment` with LLM-populated metadata including a `senses` array (min 1) each carrying `grammar_patterns` and `example_sentences`
- `POST /words/` — creates a new word with its full sense graph; accepts `WordCreate` (including `senses: list[SenseCreate]`), returns `WordRead`
- `GET /words/?skip&limit&search` — lists words with optional case-insensitive search on `word` and `translation`; each word embeds its full sense graph
- `PUT /words/{word_id}` — partially updates a word; accepts `WordUpdate` (all fields optional, including `senses`); when `senses` is provided it replaces the existing sense list; returns `WordRead`
- `DELETE /words/{word_id}` — removes a word and all its senses (cascade); returns HTTP 204

**Python-level:**

- `enrich_word(word: str) -> WordEnrichment` — async function; call from route handlers only (raises `HTTPException` on failure, not a plain exception); returns sense-based nested structure with `senses: list[SenseCreate]`
- `get_db()` — FastAPI dependency that yields a SQLAlchemy `Session` and closes it when the request completes

## External dependencies

- **FastAPI** — web framework and dependency injection
- **SQLAlchemy** — ORM and database engine
- **psycopg2-binary** — PostgreSQL driver used by SQLAlchemy
- **Pydantic** — data validation (used by FastAPI schemas and `WordEnrichment`)
- **pydantic-ai** — PydanticAI agent framework for structured LLM output
- **uvicorn** — ASGI server
- **httpx** — async HTTP client (required by pydantic-ai)

## Constraints / invariants

- `DATABASE_URL` environment variable must be set at startup; the process raises `ValueError` immediately if absent.
- `GEMINI_API_KEY` must be set for enrichment calls; requests to `POST /words/enrich` will return HTTP 422 if the key is missing or the LLM is unreachable.
- CORS is locked to `http://localhost:3000`; any other origin is rejected.
- `PUT /words/{word_id}` enforces that `word` and `translation`, if provided, are non-empty strings — an empty string triggers HTTP 400, not a schema validation error.
- Every `WordCreate` must include at least one `Sense`; every `Sense` must include at least one `GrammarPattern` and at least one `ExampleSentence` — enforced at the Pydantic layer (HTTP 422 on violation).
- `GrammarPattern.preposition` is nullable — `null` explicitly means "no preposition required".
- The enrichment agent is instantiated per-request (no singleton); this is intentional to pick up env var changes without a restart, but adds per-call overhead.
- DB tables are created at import time via `models.Base.metadata.create_all`; schema migrations are not managed (no Alembic). Breaking schema changes require a manual SQL migration script.

## Out of scope

- **Authentication / authorisation** — all endpoints are public; no API keys or user sessions
- **Schema migrations** — table creation is idempotent at startup but there is no migration toolchain; schema changes require manual intervention
- **LLM provider abstraction** — enrichment is hardwired to Google Gemini via `pydantic-ai`; switching providers requires code changes
- **Pagination defaults** — the `GET /words/` endpoint defaults to `limit=100`; the frontend overrides this to 10 for the unfiltered view

## Changelog

### 2026-05-09 (v0.3.1)

- `WordEnrichment` model updated to sense-based structure: drops flat legacy fields (`prepositions`, `example_sentences`, `idiomatic_usages`); adds `auxiliary_verb`, `principal_forms`, and `senses: list[SenseCreate]` (min 1).
- `SYSTEM_PROMPT` rewritten to instruct Gemini to return the new nested sense array with valid enum values and non-empty `grammar_patterns` / `example_sentences`.
