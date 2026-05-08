# [RFC] Enhanced Linguistic Context & Usage Fields — Vademecum Germanicum

| Author          | Simone Porreca                                                                                                              |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Project**     | Vademecum Germanicum                                                                                                        |
| **RFC status**  | Draft                                                                                                                       |
| **Review deadline** | 2026-05-17                                                                                                              |
| **Notion page** | [3 — Better Fields Structure](https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc)            |
| **GitHub repo** | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)                                         |
| **Milestone**   | [3-better-fields-structure](https://github.com/Volscente/vademecum-germanicum/milestones)                                   |

### Timeline

| Date       | Status | Note |
| :--------- | :----- | :--- |
| 2026-05-08 | Draft  |      |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Enhanced Linguistic Context & Usage Fields](#enhanced-linguistic-context--usage-fields)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The current data model stores a single flat translation string per word, which provides no guidance on how words are actually used in German sentences. Learners have no information about required prepositions, triggered grammatical cases, meaning shifts across contexts (e.g., "abdrehen" meaning both "to switch off" and "to turn away"), social register, or verb morphology. This dictionary-style model leads to grammatically incorrect sentence construction and stunted vocabulary nuance. The initiative replaces the flat model with a Sense-Based architecture that groups grammatical rules, register tags, and example sentences under discrete meaning blocks. For full context, see the [Notion initiative page](https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc).

## Objectives {#objectives}

- **Introduce Sense-Based Data Model**: Extend the backend ORM and API schemas so that each `Word` owns an ordered list of `Sense` objects, each carrying its own meaning summary, register tag, grammar patterns, and example sentences.
- **Enforce Grammatical Governance**: Every `Sense` must declare at least one `GrammarPattern` (preposition + case, or explicit "no preposition") so learners always know the correct grammatical case to use.
- **Expose Verb Morphology**: Verb entries must surface auxiliary verb (`haben`/`sein`) and the three principal forms (Infinitiv, Präteritum, Partizip II) at the `Word` level, independent of individual senses.
- **Update LLM Enrichment**: Retrain the Gemini enrichment prompt to produce the new sense-based structure, returning validated nested data that pre-populates the create form.
- **Redesign the Word Detail UI**: Replace the current flat-field `EditWordModal` with a progressive-disclosure card layout that collapses each Sense to signpost data by default and reveals examples and grammar on expansion.

## Scope {#scope}

**In-Scope:**

- Multi-sense word categorization
- Contextual example sentences with translations
- Grammatical governance (Prepositions & Cases)
- Social register/tone tagging
- Morphological inflection data (Verbs/Nouns/Conjugation)

**Out-of-Scope:**

- **Lexical relationships**: Synonyms and antonyms are deferred to a later phase.
- **Audio generation**: Voice synthesis is out of scope for this RFC.

**Constraints:**

- The UI must remain clean on mobile; "heavy" data like example translations must be hidden behind interactions (tap-to-reveal) to prevent cognitive overload.
- No `Sense` can be published without at least one example sentence and a designated grammatical case — enforced at the Pydantic schema layer.

---

# **Enhanced Linguistic Context & Usage Fields** {#enhanced-linguistic-context--usage-fields}

## Approach Overview {#approach-overview}

The designed approach adopts the author's proposed "Flat Word Model → Sense-Based Model" direction. The `Word` table remains the top-level entity but gains two new scalar fields for verb morphology (`auxiliary_verb`, `principal_forms`). A new `Sense` table replaces the current single `translation` string; each `Sense` record carries a `meaning_summary`, a `register` enum value, and foreign-key relationships to `GrammarPattern` and `ExampleSentence` child tables. This three-level hierarchy (Word → Sense → Pattern/Example) maps cleanly onto the existing SQLAlchemy ORM and Pydantic schema layers without requiring a migration toolchain — only a manual migration script is needed.

The API contract changes: `GET /words/` and `POST /words/` return `WordRead` objects that embed a `senses: list[SenseRead]` array. `POST /words/enrich` returns the same structure pre-populated by the updated Gemini prompt. The data integrity constraint (min one example sentence and one grammar pattern per Sense) is enforced at the Pydantic schema layer using `min_length=1` on list fields, so it is caught before any database write. On the frontend, `WordTable` shows a one-line summary drawn from the first sense's `meaning_summary`; `EditWordModal` is replaced by a Sense-card layout with collapsed signpost data and expandable detail.

### Integration {#integration}

The solution touches four existing backend files and five frontend files:

- **`backend/models.py`**: New SQLAlchemy models `Sense`, `GrammarPattern`, `ExampleSentence`; `Word` gains `auxiliary_verb`, `principal_forms` (JSON column), and a `senses` relationship.
- **`backend/schemas.py`**: New Pydantic schemas `SenseCreate`/`SenseRead`, `GrammarPatternCreate`/`GrammarPatternRead`, `ExampleSentenceCreate`/`ExampleSentenceRead`; `WordCreate` and `WordRead` embed `senses: list[...]`.
- **`backend/enrichment.py`**: `WordEnrichment` output model is updated to match the new nested structure; the Gemini system prompt is revised to instruct the model to return structured sense arrays.
- **`backend/main.py`**: `POST /words/` and `PUT /words/{id}` must persist nested objects within a single transaction; `GET /words/` must eager-load the sense graph via `selectinload` to avoid N+1 queries.
- **`frontend/src/types/word.ts`**: `Word` and `WordEnrichment` TypeScript interfaces are updated to reflect the new nested schema.
- **`frontend/src/lib/wordSchema.ts`**: The Zod `wordSchema` is the single source of truth for form validation and must be updated to include sense arrays; both modals must stay aligned with it.
- **`frontend/src/components/AddWordModal.tsx`**: Gains a dynamic multi-sense form section with add/remove sense controls.
- **`frontend/src/components/EditWordModal.tsx`**: Redesigned as a progressive-disclosure sense-card list.
- **`frontend/src/components/WordTable.tsx`**: Minor change — display `senses[0]?.meaning_summary ?? ''` instead of `translation` in the table row.

Note: No schema migration toolchain exists (`models.py` creates tables at startup). A manual SQL migration script must be prepared and run against the running database before deploying the new backend image.

## M1 — Data Model & API {#m1-data-model--api}

Define the new ORM models and Pydantic schemas, write and execute the manual migration script, and update all CRUD endpoints to persist and return the sense graph. Success criterion: all backend tests pass with the new `WordRead` shape; the `GET /words/` response embeds a `senses` array.

Key design decisions:

- `GrammarPattern.preposition` is nullable (NULL means "no preposition required"), making the absence explicit rather than a magic string.
- `GrammarPattern.case` is a new `CaseEnum` with values `Nominativ`, `Akkusativ`, `Dativ`, `Genitiv`.
- `ExampleSentence` stores `german` and `english` as plain `VARCHAR` columns.
- Eager loading on `GET /words/` uses SQLAlchemy `selectinload` to avoid N+1 queries.
- `principal_forms` on `Word` is stored as a JSON column (list of 3 strings: Infinitiv, Präteritum, Partizip II) to avoid a dedicated table for a fixed-length structure.

## M2 — LLM Enrichment Update {#m2-llm-enrichment-update}

Update the `WordEnrichment` Pydantic model in `enrichment.py` and revise the Gemini system prompt to instruct the model to return a sense array matching the new schema. Success criterion: `POST /words/enrich` returns a valid `WordRead`-compatible JSON with at least one sense, one grammar pattern, and one example sentence for a test word.

Key design decisions:

- PydanticAI's structured output mode is already in use; updating `WordEnrichment` field definitions is sufficient to guide the model's output shape.
- The system prompt must explicitly instruct Gemini to always populate `grammar_patterns` and `example_sentences` to satisfy the data integrity constraints enforced downstream.
- If the LLM returns an empty list for either field, the enrichment endpoint returns HTTP 422 with a descriptive error — the user must retry or manually fill the fields.

## M3 — Frontend Refactor {#m3-frontend-refactor}

Update TypeScript interfaces, Zod schema, and all three affected components. Implement the progressive-disclosure Sense card in `EditWordModal`, the multi-sense input form in `AddWordModal`, and the first-sense summary in `WordTable`. Success criterion: the full create → enrich → save → view → delete flow works end-to-end in the browser with the new data shape.

Key design decisions:

- Each Sense is rendered as a collapsible card in `EditWordModal`. The collapsed state shows: `meaning_summary`, `register` badge, and `grammar_patterns` (preposition + case chips). Expanding reveals `example_sentences` with tap-to-reveal English translations.
- In `AddWordModal`, the enrichment button populates the Sense array; the user can add additional senses manually via an "Add Sense" control.
- The table row in `WordTable` displays `senses[0]?.meaning_summary ?? ''` — no other table columns change.
- Zod schema is updated first; both modals are updated in the same PR to avoid breaking the shared contract.

## Tech Stack {#tech-stack}

- **FastAPI**: Web framework for all REST endpoints; unchanged — existing routes are extended to handle nested JSON bodies.
- **SQLAlchemy**: ORM; new models `Sense`, `GrammarPattern`, `ExampleSentence` follow the existing pattern in `models.py`; `selectinload` used for eager loading the sense graph.
- **Pydantic**: Schema validation; data integrity constraints (min 1 example, min 1 grammar pattern per Sense) implemented via `min_length=1` on list fields — consistent with the existing validation pattern.
- **PydanticAI + Google Gemini**: LLM enrichment; existing structured-output pattern is reused — only `WordEnrichment` field definitions and the system prompt change.
- **React Hook Form + Zod**: Frontend form validation; `wordSchema` is extended to validate the nested sense array; `useFieldArray` from React Hook Form manages the dynamic sense list in `AddWordModal`.
- **Tailwind CSS v4**: Styling; no new utilities needed — collapsible cards use existing `forest-*` palette and `transition` utilities.

**Desired / experimental:**

- **Progressive Disclosure UI (Expandable Sense Cards + Tap-to-Reveal)**: Sense cards are collapsed by default, showing only signpost data (meaning summary, register badge, grammar pattern chips). Tapping reveals example translations to encourage active recall. This addresses the mobile real-estate constraint without hiding critical grammar information.
- **Nested Grammar Pattern Arrays**: The schema supports a one-to-many relationship between a `Sense` and its `GrammarPattern` entries, allowing a single sense to carry multiple preposition+case combinations (e.g., "warten" governs both `auf + Akkusativ` and `auf + Dativ` in different registers).

## Effort Estimations {#effort-estimations}

Total estimated effort: **{N} sessions**.

| Milestone                | Description                                                                       | Est. effort | GitHub Issue |
| :----------------------- | :-------------------------------------------------------------------------------- | :---------- | :----------- |
| M1 — Data Model & API    | New ORM models, Pydantic schemas, migration script, updated CRUD endpoints, tests | {N}         | #{issue}     |
| M2 — LLM Enrichment      | Updated `WordEnrichment` model, revised Gemini system prompt, integration test    | {N}         | #{issue}     |
| M3 — Frontend Refactor   | Updated TS interfaces, Zod schema, AddWordModal, EditWordModal, WordTable          | {N}         | #{issue}     |

### Recommended Order

1. M1 — Data Model & API (establishes the contract that M2 and M3 depend on)
2. M2 — LLM Enrichment Update (can proceed in parallel with M3 once M1 is merged; enrichment output must match the M1 schema)
3. M3 — Frontend Refactor (depends on M1 for the TypeScript interface shape; must be deployed atomically with M1)

---

# **FAQs** {#faqs}

**Q: Why attach `auxiliary_verb` and `principal_forms` to `Word` rather than to each `Sense`?**

A: These are morphological properties of the verb itself — the auxiliary and principal forms are fixed regardless of which sense is being used. Duplicating them across every Sense would create redundancy and risk of inconsistency. They are promoted to the `Word` level and displayed in a dedicated "Verb Morphology" section in the detail view, above the sense cards.

**Q: Why enforce the minimum-one-example and minimum-one-grammar-pattern constraint at the Pydantic layer rather than the database layer?**

A: Pydantic validation fires before any database write, returns a structured HTTP 422 response with field-level error messages, and is already the established pattern in this codebase. Adding a `NOT NULL` database constraint would enforce the same rule at the DB level but produce a less user-friendly error. Both layers can be combined in a future hardening pass if needed.

**Q: What happens to existing word entries after the migration?**

A: The manual migration script drops the `translation` column and creates the new `sense`, `grammar_pattern`, and `example_sentence` tables. Existing word rows will have no senses — they appear in the UI with an empty sense list and a prompt to re-enrich or edit. No data from the old `translation` column is migrated automatically; users must re-enrich or manually add senses to existing words.

**Q: How does `GET /words/` change for the table view — won't eager-loading the full sense graph be heavy?**

A: For the current dataset size (personal vocabulary, O(100) words), eager-loading with `selectinload` adds negligible overhead and avoids the complexity of a separate summary endpoint. If the dataset grows substantially, a dedicated `GET /words/summary` endpoint returning only `id`, `word`, and `senses[0].meaning_summary` can be introduced without breaking the existing contract.

**Q: Terminology?**

A:

- **Sense** → A discrete meaning block within a word entry, analogous to a numbered definition in a dictionary. Each Sense has its own register, grammar patterns, and example sentences.
- **GrammarPattern** → A (preposition, grammatical case) pair describing how the word governs sentence structure within a particular Sense. Preposition is nullable — NULL means "no preposition required."
- **CaseEnum** → Enumeration of German grammatical cases: `Nominativ`, `Akkusativ`, `Dativ`, `Genitiv`.
- **Register** → Social/stylistic label for a Sense: `Formal`, `Colloquial`, `Neutral`, `Technical`.
- **Principal Forms** → The three canonical verb forms used for conjugation: Infinitiv, Präteritum (3rd person singular), Partizip II.

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question                                                                                                         | Likelihood | Mitigation / Answer                                                                                                                                           |
| :---------------------------------------------------------------------------------------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Manual schema migration causes data loss or inconsistency (no Alembic)                                                  | Medium     | Prepare and test the SQL script against a local DB backup before running on the live container; document rollback steps.                                       |
| Gemini returns incomplete sense arrays (missing grammar patterns or examples), failing Pydantic validation               | Medium     | Set `min_length=1` on both lists; add explicit instructions in the system prompt; surface HTTP 422 errors in the UI with a "retry enrichment" affordance.      |
| UI complexity overwhelms A1 learners despite progressive disclosure                                                     | Medium     | Default all Sense cards to collapsed; run a brief usability check with a sample word before finalising the card layout.                                        |
| Breaking `GET /words/` response shape causes frontend errors if M1 and M3 are not deployed atomically                  | High       | Merge M1 (backend) and M3 (frontend) in a single coordinated deployment; do not expose the new API to the frontend until both are ready.                       |

## References {#references}

- [Notion Initiative: 3 — Better Fields Structure](https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc)
- [Vademecum Germanicum GitHub Repository](https://github.com/Volscente/vademecum-germanicum)
