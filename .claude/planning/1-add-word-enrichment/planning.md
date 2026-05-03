# Add Word Enrichment — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [Milestone: add-word-enrichment](https://github.com/Volscente/vademecum-germanicum/milestone/3)
**Notion page:** [Add Word Enrichment](https://www.notion.so/1-Add-Word-Enrichment-3545cc6c0f0780c3a0d4e11f3aa47880)
**Total estimated effort:** 3 FTE-days (1 FTE = 1 day)

## Overview

This initiative adds a one-click enrichment feature to the word creation flow. When a user enters a German word and clicks "Enrich", the frontend calls a new backend endpoint that delegates to a PydanticAI agent (routed through LiteLLM to Gemini Flash) and returns structured field values matching the `WordCreate` schema. The returned values pre-fill the form fields; the user reviews and confirms before saving.

### Dependency Order

```txt
TASK-1 ──► TASK-2 ──► TASK-3
```

## TASK-1 — Backend LLM Dependencies and Configuration

**GitHub Issue:** [Backend Enrichment API](https://github.com/Volscente/vademecum-germanicum/issues/23)
**Effort estimate:** 0.5 FTE-days

### Scope

Add PydanticAI and LiteLLM as backend dependencies and configure the environment variables required to route LLM calls to the Gemini Flash free tier via Google AI Studio.

### Goal

Establish the dependency and configuration foundation so that subsequent tasks can import and use PydanticAI/LiteLLM without additional setup work.

### Deliverables

- `backend/pyproject.toml` — updated with `pydantic-ai` and `litellm` dependencies
- `uv.lock` — updated lockfile
- `.env.example` — documented environment variables for LLM provider configuration
- `docker-compose.yml` — environment variables forwarded to backend container

### Technical Overview

PydanticAI and LiteLLM are added to the backend package via `uv add --package backend`. LiteLLM requires a model identifier (e.g. `gemini/gemini-2.0-flash`) and an API key (`GEMINI_API_KEY`) sourced from environment variables. The `docker-compose.yml` must forward these variables into the backend container. An `.env.example` entry documents the required keys.

## TASK-2 — Enrichment Module and Endpoint with Tests

**GitHub Issue:** [Backend Enrichment API](https://github.com/Volscente/vademecum-germanicum/issues/23)
**Effort estimate:** 1.5 FTE-days

### Scope

Implement the `enrichment.py` module containing the PydanticAI agent and `WordEnrichment` Pydantic model, add the `POST /words/enrich` route to `main.py`, and write unit and integration tests covering the endpoint.

### Goal

Deliver a working, tested API endpoint that accepts `{ "word": "<string>" }` and returns LLM-enriched field values validated against a typed schema. This establishes the contract the frontend depends on.

### Deliverables

- `backend/src/backend/enrichment.py` — `WordEnrichment` model, PydanticAI agent definition, `enrich_word(word: str) -> WordEnrichment` function
- `backend/src/backend/main.py` — new `POST /words/enrich` route
- `backend/src/backend/schemas.py` — `WordEnrichRequest` schema (if needed for request validation)
- `backend/tests/test_enrichment.py` — unit tests (mocked LLM) and integration tests for the endpoint

### Technical Overview

**Data model:** `WordEnrichment` is a Pydantic model representing a strict subset of `WordCreate` fields (gender, category, translation, etc.). It is the structured output type enforced by the PydanticAI agent.

**Agent:** A PydanticAI agent is instantiated with `WordEnrichment` as its `result_type`. The agent's system prompt instructs the LLM to extract German word metadata. LiteLLM is configured as the model provider, defaulting to `gemini/gemini-2.0-flash`.

**Endpoint:** `POST /words/enrich` accepts `{ "word": str }`, calls `enrich_word()`, and returns the validated `WordEnrichment` as JSON. LLM/validation errors are caught and returned as `422` responses with descriptive messages.

**Testing:** Unit tests mock the PydanticAI agent to verify schema validation and error handling without LLM calls. Integration tests use `TestClient` against the endpoint with a mocked LLM layer.

## TASK-3 — Frontend Enrich Button Integration

**GitHub Issue:** [Frontend Enrichment UI](https://github.com/Volscente/vademecum-germanicum/issues/24)
**Effort estimate:** 1 FTE-day

### Scope

Add an "Enrich" button to the `AddWordModal` component that calls `POST /words/enrich`, pre-fills form fields with the response, and handles loading and error states.

### Goal

Deliver the user-facing enrichment interaction: a single click populates all word metadata fields from the entered word, with clear loading feedback and non-blocking error handling.

### Deliverables

- `frontend/src/app/components/AddWordModal.tsx` — "Enrich" button, API call, `setValue` integration for each returned field
- `frontend/src/lib/api.ts` (or equivalent) — `enrichWord(word: string)` fetch wrapper (if a shared API layer exists)

### Technical Overview

The "Enrich" button reads the current word input value, sends a `POST` to `/words/enrich`, and on success calls React Hook Form's `setValue` for each field in the response. The button is disabled during the request and shows a loading indicator (spinner or text). Errors are surfaced via a toast or inline message without clearing the form. The button is only enabled when the word input is non-empty.

## GitHub Issues

### Milestone 1 — Backend Enrichment API

**Tasks:** TASK-1, TASK-2
**Effort:** 2 FTE-days

#### Scope

Set up LLM dependencies (PydanticAI, LiteLLM), implement the enrichment module with a PydanticAI agent that produces typed output, expose a `POST /words/enrich` endpoint, and cover the endpoint with unit and integration tests.

#### Goal

Deliver a stable, tested backend API that accepts a German word and returns structured enrichment data, establishing the contract the frontend will consume.

#### Deliverables

- `backend/pyproject.toml` and `uv.lock` updated with PydanticAI and LiteLLM
- `.env.example` with LLM provider environment variables
- `docker-compose.yml` forwarding LLM env vars
- `backend/src/backend/enrichment.py` (agent, model, `enrich_word` function)
- `backend/src/backend/main.py` updated with `POST /words/enrich` route
- `backend/tests/test_enrichment.py` (unit + integration tests)

### Milestone 2 — Frontend Enrichment UI

**Tasks:** TASK-3
**Effort:** 1 FTE-day

#### Scope

Add the "Enrich" button to the word creation modal, wire it to the backend endpoint, and handle loading and error states.

#### Goal

Deliver the user-facing enrichment interaction so that a single click populates word metadata fields from LLM output, with the user retaining full control before saving.

#### Deliverables

- `frontend/src/app/components/AddWordModal.tsx` updated with Enrich button and API integration
- Fetch wrapper for the enrichment endpoint (if applicable)
