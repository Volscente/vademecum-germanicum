# Backend — Vademecum Germanicum

FastAPI backend for the Vademecum Germanicum German vocabulary app.

## Modules

- `main.py` — FastAPI app, route definitions, CORS config
- `models.py` — SQLAlchemy ORM models (`Word`, `GenderEnum`, `CategoryEnum`)
- `schemas.py` — Pydantic request/response schemas
- `database.py` — Database engine and session factory
- `enrichment.py` — Word enrichment via PydanticAI with Google Gemini

## Key Functions

- `enrich_word(word: str) -> WordEnrichment` — Sends a German word to the LLM and returns structured metadata (gender, translation, category, etc.)

## Usage

### Word Enrichment

```bash
curl -X POST http://localhost:8000/words/enrich \
  -H "Content-Type: application/json" \
  -d '{"word": "Zuschlag"}'
```

Response:

```json
{
  "gender": "der",
  "word_nominative": "Zuschlag",
  "word_genitive": "des Zuschlags",
  "word_plural": "Zuschläge",
  "translation": "Surcharge",
  "category": "noun",
  "prepositions": null,
  "example_sentences": "Der Zuschlag beträgt fünf Euro.",
  "idiomatic_usages": null
}
```

Requires `GEMINI_API_KEY` and `LLM_MODEL` environment variables (see `.env.example`).

## Changelog

### 2026-05-03

- Added `enrichment.py` module with `WordEnrichment` model, PydanticAI agent, and `enrich_word()` function
- Added `WordEnrichRequest` schema to `schemas.py`
- Added `POST /words/enrich` endpoint to `main.py`
- Added enrichment tests in `test_enrichment.py` (success, missing field, empty string, agent error)
- Updated `.env.example` to use native Google model name format (`gemini-2.0-flash`)
