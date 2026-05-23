# backend

FastAPI application exposing the REST API for Vademecum Germanicum. Handles all HTTP routing, database access via SQLAlchemy, and Pydantic schema validation. Serves as the single integration point between the Next.js frontend and the PostgreSQL database.

## Key components

- **main.py** — FastAPI app, CORS config, and all route handlers (`/words/`, `/senses/`, `/words/enrich`)
- **models.py** — SQLAlchemy ORM models (`Word`, `Sense`, `GrammarPattern`, `ExampleSentence`) and enumerations (`GenderEnum`, `CategoryEnum`, `CaseEnum`, `RegisterEnum`, `DifficultyLevelEnum`)
- **schemas.py** — Pydantic request/response schemas (`WordCreate`, `WordRead`, `WordUpdate`, `SenseRead`, `SenseWithWordRead`, `SenseReviewUpdate`, `WordEnrichRequest`)
- **database.py** — SQLAlchemy engine and `get_db` session factory; tables created at startup via `metadata.create_all`
- **enrichment.py** — PydanticAI agent using Google Gemini to populate word metadata from a single word string

## Public interfaces

- `GET /` — health-check root
- `GET /words/` — list words with full sense graph; supports `search`, `skip`, `limit` query params
- `POST /words/` — create a word with nested senses, grammar patterns, and example sentences
- `PUT /words/{word_id}` — partially update a word; replaces senses when `senses` key is present
- `DELETE /words/{word_id}` — delete a word and its entire sense graph
- `POST /words/enrich` — enrich a German word string via LLM and return structured metadata
- `GET /senses/` — return all senses with their parent word's key fields embedded (`SenseWithWordRead`)
- `PUT /senses/{sense_id}/review` — update `difficulty_level` and stamp `last_reviewed_at` for a sense

## External dependencies

- **FastAPI** — HTTP framework and request/response lifecycle
- **SQLAlchemy** — ORM and query layer over PostgreSQL
- **Pydantic** — schema validation and serialisation
- **psycopg2** — PostgreSQL driver
- **PydanticAI / Google Gemini** — LLM-backed word enrichment in `enrichment.py`

## Constraints / invariants

- `difficulty_level` defaults to `"Medium"` for all new senses; `last_reviewed_at` starts `NULL`.
- `last_reviewed_at` is always set server-side using `datetime.now(timezone.utc)` — never trusted from the client.
- Schema columns added after initial table creation require a manual SQL migration (`migrations/add_sense_review_columns.sql`); `create_all` does not ALTER existing tables.
- A `Word` must have at least one `Sense`; each `Sense` must have at least one `GrammarPattern` and one `ExampleSentence` (enforced by Pydantic `Field(min_length=1)`).

## Out of scope

- **Alembic / automated migrations** — the project uses hand-authored SQL scripts run via `just run_migration`.
- **Authentication / authorisation** — no auth layer; CORS is restricted to `http://localhost:3000` for local dev only.
- **Spaced Repetition System logic** — badge computation is a frontend concern in `reviewUtils.ts`.

---

## Changelog

### 2026-05-23

- Added `DifficultyLevelEnum` (`Easy`, `Medium`, `Hard`, `VeryHard`) to `models.py`.
- Added `difficulty_level` and `last_reviewed_at` columns to the `Sense` ORM model.
- Added `SenseReviewUpdate` and `SenseWithWordRead` Pydantic schemas to `schemas.py`; extended `SenseRead` with the two new fields.
- Implemented `GET /senses/` endpoint returning all senses with parent word fields embedded.
- Implemented `PUT /senses/{sense_id}/review` endpoint for difficulty rating and timestamp stamping.
