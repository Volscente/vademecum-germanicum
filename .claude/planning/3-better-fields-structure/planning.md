# Enhanced Linguistic Context & Usage Fields — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [3-better-fields-structure](https://github.com/Volscente/vademecum-germanicum/milestones)
**Notion page:** [3 — Better Fields Structure](https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc)
**Total estimated effort:** 4.5 FTE-days (1 FTE = 1 day)

---

## Overview

Replaces the flat single-translation `Word` model with a Sense-Based architecture: each `Word` owns an ordered list of `Sense` objects, each carrying its own meaning summary, register tag, grammar patterns, and example sentences. The backend gains three new ORM models, updated Pydantic schemas, and updated CRUD endpoints; the Gemini enrichment prompt is retrained to return the new nested structure; the frontend modals are redesigned with progressive-disclosure sense cards.

### Dependency Order

```txt
TASK-1 ──► TASK-2 (parallel)
    │
    └──► TASK-3 (parallel)
```

---

## TASK-1 — Data Model & API

**GitHub Issue:** [Data Model & API](https://github.com/Volscente/vademecum-germanicum/issues/35)
**Effort estimate:** 2.5 FTE-days

### Scope

Define the new SQLAlchemy ORM models (`Sense`, `GrammarPattern`, `ExampleSentence`), extend `Word` with verb morphology fields, update all Pydantic schemas, write and execute a manual SQL migration script, and update all CRUD endpoints to persist and return the full sense graph.

### Goal

All backend tests pass with the new `WordRead` shape; `GET /words/` returns a `senses` array per word; `POST /words/` and `PUT /words/{id}` persist nested sense objects within a single transaction.

### Deliverables

- `backend/src/backend/models.py` — new `Sense`, `GrammarPattern`, `ExampleSentence` ORM models; `Word` gains `auxiliary_verb`, `principal_forms` (JSON), and `senses` relationship; `CaseEnum` and `RegisterEnum` added
- `backend/src/backend/schemas.py` — `SenseCreate`/`SenseRead`, `GrammarPatternCreate`/`GrammarPatternRead`, `ExampleSentenceCreate`/`ExampleSentenceRead`; `WordCreate`/`WordRead` embed `senses: list[...]`
- `backend/src/backend/main.py` — updated `POST /words/`, `PUT /words/{id}` (transactional nested persistence), `GET /words/` (eager-load via `selectinload`)
- `migration.sql` — manual SQL migration script (drops `translation` column, creates new tables)
- `backend/tests/` — updated and new tests covering the new `WordRead` shape

### Technical Overview

- `GrammarPattern.preposition` is nullable (NULL = no preposition required); `GrammarPattern.case` uses a new `CaseEnum` (`Nominativ`, `Akkusativ`, `Dativ`, `Genitiv`).
- `ExampleSentence` stores `german` and `english` as plain `VARCHAR` columns.
- `principal_forms` on `Word` is a JSON column (list of 3 strings: Infinitiv, Präteritum, Partizip II) — no separate table.
- Data integrity (min 1 example sentence, min 1 grammar pattern per `Sense`) enforced at the Pydantic layer via `min_length=1`.
- Eager loading on `GET /words/` uses SQLAlchemy `selectinload` to prevent N+1 queries.
- No migration toolchain exists; a manual SQL script must be run against the live database before deploying the new image.

---

## TASK-2 — LLM Enrichment Update

**GitHub Issue:** [LLM Enrichment Update](https://github.com/Volscente/vademecum-germanicum/issues/36)
**Effort estimate:** 0.5 FTE-days

### Scope

Update `WordEnrichment` in `backend/src/backend/enrichment.py` to match the new sense-based schema and revise the Gemini system prompt to return a structured sense array.

### Goal

`POST /words/enrich` returns a valid `WordRead`-compatible JSON with at least one sense, one grammar pattern, and one example sentence for a test word.

### Deliverables

- `backend/src/backend/enrichment.py` — `WordEnrichment` Pydantic model updated to nested `Sense`/`GrammarPattern`/`ExampleSentence` structure; Gemini system prompt revised
- Integration test for `POST /words/enrich` validating the new response shape

### Technical Overview

- PydanticAI's structured output mode is already in use; updating `WordEnrichment` field definitions is sufficient to guide the model's output shape.
- The system prompt must explicitly instruct Gemini to always populate `grammar_patterns` and `example_sentences`.
- If the LLM returns an empty list for either field, the endpoint returns HTTP 422 with a descriptive error.

---

## TASK-3 — Frontend Refactor

**GitHub Issue:** [Frontend Refactor](https://github.com/Volscente/vademecum-germanicum/issues/37)
**Effort estimate:** 1.5 FTE-days

### Scope

Update TypeScript interfaces and Zod schema, then update all three affected components: `AddWordModal` (multi-sense dynamic form), `EditWordModal` (progressive-disclosure sense-card layout), and `WordTable` (first-sense summary display).

### Goal

The full create → enrich → save → view → delete flow works end-to-end in the browser with the new nested data shape.

### Deliverables

- `frontend/src/types/word.ts` — `Word` and `WordEnrichment` interfaces updated to nested sense schema
- `frontend/src/lib/wordSchema.ts` — Zod `wordSchema` extended to validate sense arrays
- `frontend/src/components/AddWordModal.tsx` — dynamic multi-sense form section with add/remove sense controls using `useFieldArray`
- `frontend/src/components/EditWordModal.tsx` — redesigned as collapsible sense-card list with progressive disclosure
- `frontend/src/components/WordTable.tsx` — display `senses[0]?.meaning_summary ?? ''` instead of `translation`

### Technical Overview

- Zod schema is updated first; both modals are updated in the same PR to avoid breaking the shared contract.
- Each Sense card in `EditWordModal`: collapsed state shows `meaning_summary`, `register` badge, and grammar pattern chips; expanded state reveals `example_sentences` with tap-to-reveal English translations.
- `useFieldArray` from React Hook Form manages the dynamic sense list in `AddWordModal`.
- No new Tailwind utilities needed — existing `forest-*` palette and `transition` utilities are sufficient.

---

## GitHub Issues

### Milestone 1 — Data Model & API

**Tasks:** TASK-1
**Effort:** 2.5 FTE-days

#### Scope

Establish the new Sense-Based data model in the backend ORM and Pydantic schemas, execute the manual database migration, and update all CRUD endpoints to persist and return the nested sense graph.

#### Goal

Backend is fully migrated to the new schema; all existing tests pass; `GET /words/` returns sense arrays; `POST /words/` and `PUT /words/{id}` accept and persist nested senses.

#### Deliverables

- New SQLAlchemy models: `Sense`, `GrammarPattern`, `ExampleSentence`
- `Word` model extended with `auxiliary_verb`, `principal_forms` (JSON), and `senses` relationship
- `CaseEnum` and `RegisterEnum` added to `models.py`
- New Pydantic schemas: `SenseCreate`, `SenseRead`, `GrammarPatternCreate`, `GrammarPatternRead`, `ExampleSentenceCreate`, `ExampleSentenceRead`
- `WordCreate` and `WordRead` updated to embed `senses: list[SenseRead]`
- `migration.sql` executed against the live database
- Updated `POST /words/`, `PUT /words/{id}`, `GET /words/` endpoints
- Updated and new backend tests

---

### Milestone 2 — LLM Enrichment Update

**Tasks:** TASK-2
**Effort:** 0.5 FTE-days

#### Scope

Retrain the Gemini enrichment pipeline to produce the new nested sense structure by updating `WordEnrichment` and the Gemini system prompt.

#### Goal

`POST /words/enrich` returns a valid, schema-compliant nested JSON with sense, grammar pattern, and example sentence populated for a test word.

#### Deliverables

- Updated `WordEnrichment` Pydantic model in `enrichment.py`
- Revised Gemini system prompt
- Integration test for `POST /words/enrich`

---

### Milestone 3 — Frontend Refactor

**Tasks:** TASK-3
**Effort:** 1.5 FTE-days

#### Scope

Update all frontend types, validation schema, and the three affected React components to consume the new nested API response and expose multi-sense authoring to the user.

#### Goal

Full end-to-end flow (create → enrich → save → view → delete) works in the browser with the new data shape; no regressions in existing functionality.

#### Deliverables

- Updated `Word` and `WordEnrichment` TypeScript interfaces in `word.ts`
- Updated Zod `wordSchema` with sense array validation in `wordSchema.ts`
- `AddWordModal.tsx` with dynamic multi-sense form using `useFieldArray`
- `EditWordModal.tsx` redesigned as progressive-disclosure sense-card list
- `WordTable.tsx` updated to display `senses[0]?.meaning_summary ?? ''`
