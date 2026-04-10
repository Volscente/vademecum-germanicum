---
name: Sprint 1 - The Enrichment Service
description: Phase 3, Sprint 1 — LLM-powered word enrichment with auto-fill UI
type: project
---

# Sprint 1: The Enrichment Service

## Sprint Goal

Solve the "Data Entry" friction by implementing an LLM-powered enrichment service that transforms a single German word into a rich linguistic entry, with user review before saving.

## Deliverables

- **Auto-fill button in the UI** — "Magic Wand" icon to trigger enrichment
- **UI Spinner** — Prevent accidental double LLM calls during processing
- **Enrichment Review Interface** — Show enriched fields to user for review/editing before saving
- **Python Service Layer** — Prompts an LLM and returns structured JSON matching DB schema

## Tech Stack

- **LangChain** or **LiteLLM** (for easy provider swapping: Gemini, GPT-4, etc.)
- **Pydantic Output Parser** (force LLM to return exactly our DB schema structure)

## Tasks (Code Perspective)

1. **Prompt Engineering**
   - Craft a "System Prompt" that tells the LLM: _"You are a German linguist. Return JSON only."_
   - Define exact output schema (matches `WordCreate` or `WordUpdate` schema)

2. **Enrichment Endpoint**
   - Create FastAPI route: `POST /enrich` or `GET /enrich?word=Katze`
   - Service layer to call LLM with prompt
   - Return structured JSON to frontend

3. **UI Integration**
   - Add "Magic Wand" icon next to German word input field
   - Trigger enrichment endpoint on click
   - Show spinner while request is in flight
   - Populate form fields with response (user can review/edit)
   - Disable button during request (prevent double-submit)

## Backlog / Future Considerations

- Explore **Pydantic AI** for more ergonomic schema validation
- Evaluate **LiteLLM** for production robustness
- Caching enriched results for repeated words
- Batch enrichment for bulk vocabulary imports
