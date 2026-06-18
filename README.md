# Vademecum Germanicum

An AI-augmented, data-driven companion for mastering German vocabulary. A custom-built vocabulary engine featuring automated linguistic enrichment, a structured sense graph, and spaced-repetition review logic.

---

## Scope

Vademecum Germanicum is a personal German vocabulary manager designed to go beyond simple word-translation pairs. Each word is modelled as a rich linguistic object — a nested graph of **senses**, each carrying grammar patterns (verb cases, prepositions), example sentences, and review metadata. The application is self-hosted and fully local: no cloud accounts, no shared data, no authentication.

---

## Vision

Traditional flashcard tools treat a word as a single card. German vocabulary is more nuanced: a single verb has multiple senses, each governed by different case frames and prepositions. The goal of this project is to:

- Capture that full sense-level granularity in a structured, queryable format.
- Automate the tedious parts of vocabulary entry (gender, declension, example sentences) via LLM enrichment.
- Surface what to review and when, based on per-sense difficulty ratings and elapsed time since last review.

The long-term direction is a vocabulary engine that learns from how the user rates each sense and prioritises review accordingly.

---

## Features

### Vocabulary Management

- Add, edit, and delete German words with full metadata: part of speech, grammatical gender, plural form, verb morphology (auxiliary verb, principal forms).
- Each word carries one or more **senses**, each with a meaning summary and translation.
- Nested **grammar patterns** per sense: case (Nominativ, Akkusativ, Dativ, Genitiv) and optional preposition.
- Nested **example sentences** per sense for contextual reinforcement.
- Case-insensitive search across word and translation fields; debounced input for smooth UX.
- Light and dark mode with system-preference detection and `localStorage` persistence.

### AI Enrichment

- One-click enrichment via a **Google Gemini LLM**: given a word string, the backend generates a fully populated sense graph — gender, plural, principal forms, grammar patterns, and example sentences — structured to match the application's data model.
- Enrichment output is loaded directly into the add/edit form for review and correction before saving.
- Re-enrichment is available in the edit modal to refresh an existing word's metadata.

### Spaced Repetition Review

- A **Learning Area** lists all senses with a "To Review" badge computed from the last review timestamp and a per-difficulty threshold (`Easy: 7 days`, `Medium: 3 days`, `Hard: 1 day`, `VeryHard: due immediately`).
- Users select senses to review and launch a **Review Session**: a full-screen flashcard flow, one sense at a time.
- Each card shows word information, optional verb morphology, and sense details in collapsible sections.
- Selecting a difficulty rating (Easy / Medium / Hard / Very Hard) stamps `last_reviewed_at` server-side and advances to the next card with a smooth CSS transition.
- A completion screen is shown when all queued cards have been rated, with navigation back to either the Vocabulary or Learning area.

---

## Architecture

```
Frontend (Next.js, :3000)
        |
        | HTTP (REST)
        v
Backend (FastAPI, :8000)
        |
        | SQLAlchemy
        v
PostgreSQL (:5432, container: vademecum_db)
        
Backend also calls:
Google Gemini API (via PydanticAI, for /words/enrich)
```

### Monorepo Structure

The project is a `uv` workspace monorepo. A single `uv.lock` file locks all Python dependencies across workspace members.

| Path | Purpose |
|---|---|
| `backend/` | FastAPI application — data persistence, REST API, LLM enrichment |
| `frontend/` | Next.js 16 SPA — vocabulary UI, review sessions, search |
| `justfile` | Task runner: start/stop services, run tests, apply migrations |
| `docker-compose.yml` | Orchestrates backend + PostgreSQL containers |
| `migrations/` | Manual SQL migration scripts (no Alembic) |

### Backend

A **FastAPI** application serving the data and AI layer. Key responsibilities:

- Persists words and their sense graphs in **PostgreSQL** via **SQLAlchemy** ORM.
- Exposes a REST API consumed by the frontend (CORS locked to `localhost:3000`).
- Delegates enrichment to **Google Gemini** via **PydanticAI**, returning a structured `WordEnrichment` object.
- Stamps `last_reviewed_at` and validates `difficulty_level` server-side on every review update.

Core data model: `Word` → `Sense[]` → `GrammarPattern[]` + `ExampleSentence[]`. Every word must have at least one sense; every sense at least one grammar pattern and one example sentence — enforced at both the Pydantic and database layers.

See [`backend/README.md`](backend/README.md) for full API reference, schema details, and constraints.

### Frontend

A **Next.js 16** single-page application. Key responsibilities:

- Renders the vocabulary list (`WordTable`), handles search (`SearchBar`), and manages the add/edit modals (`AddWordModal`, `EditWordModal`).
- Drives the full review flow: sense selection (`SensesTable`) → flashcard session (`ReviewArea` + `SenseCard`) → completion screen (`ReviewCompleteScreen`).
- Form validation via **Zod** + **React Hook Form**; schemas mirror the backend Pydantic constraints to prevent silent contract drift.
- Nested `useFieldArray` for senses and grammar patterns inside forms.

See [`frontend/README.md`](frontend/README.md) for component reference, public interfaces, and constraints.

### Development

All common workflows are defined in the `justfile`:

```bash
just dev                  # Start full stack (PostgreSQL + backend + frontend)
just run_tests            # Run pytest suite inside Docker
just stop_backend         # Stop all Docker services
```

Environment variables (database URL, Gemini API key) are loaded from `.env` via `set dotenv-load` in the justfile.
