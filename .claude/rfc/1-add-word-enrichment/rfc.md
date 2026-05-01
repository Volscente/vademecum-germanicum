# [RFC] Add Word Enrichment — Vademecum Germanicum

| Author              | Simone Porreca                                                                                                                                           |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**         | Vademecum Germanicum                                                                                                                                     |
| **RFC status**      | Draft                                                                                                                                                    |
| **Review deadline** | 2026-05-03                                                                                                                                               |
| **Notion page**     | [Add Word Enrichment](https://www.notion.so/ec2d1072f12045b4b6d46dceb5f1b7cd?v=33ad0937458546728e0a7c8743ea4010&p=2fe5cc6c0f078014a362e578a13f6a46&pm=s) |
| **GitHub repo**     | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)                                                                      |
| **Milestone**       | [Milestone: add-word-enrichment](https://github.com/Volscente/vademecum-germanicum/milestone/{N})                                                        |

### Timeline

| Date       | Status | Note |
| :--------- | :----- | :--- |
| 2026-05-01 | Draft  |      |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Add Word Enrichment](#add-word-enrichment)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The word creation flow in Vademecum Germanicum currently requires users to manually fill in every field for each new German word — gender, category, translations, and any additional metadata. This is repetitive and error-prone, particularly for learners who may be uncertain about the correct values. A one-click enrichment action triggered from the word creation form would delegate this lookup to an LLM, automatically populating all fields from a single input, reducing friction and improving data quality. For full context, see the [Notion initiative page](https://www.notion.so/ec2d1072f12045b4b6d46dceb5f1b7cd?v=33ad0937458546728e0a7c8743ea4010&p=3535cc6c0f0780d2a72cc71a319b382e&pm=s).

## Objectives {#objectives}

- **Add enrichment trigger**: A button in the word creation form allows the user to request automatic field population without leaving the form.
- **Implement enrichment endpoint**: A new backend API endpoint accepts a (partial) word and returns LLM-generated values for all missing fields.
- **Integrate structured LLM output**: Use PydanticAI to enforce a typed response schema so enriched data maps directly to the `WordCreate` schema.
- **Abstract model provider**: Route LLM calls through LiteLLM so the underlying model can be swapped without changing application code.
- **Preserve user control**: Enriched values pre-fill the form but remain editable before submission; the user always confirms before saving.

## Scope {#scope}

**In-Scope:**

- Enrichment button added to the existing word creation modal in the frontend
- New `POST /words/enrich` backend endpoint that accepts a word string and returns enriched field values
- PydanticAI agent definition with a structured output schema matching the `WordCreate` Pydantic model
- LiteLLM integration as the model provider abstraction layer
- Unit and integration tests covering the enrichment endpoint

**Out-of-Scope:**

- **Enrichment for existing words**: Editing an already-saved word is a separate flow and out of scope for this RFC.
- **Batch enrichment**: Enriching multiple words at once is not required and adds complexity not justified by current usage.
- **Custom model selection in UI**: Letting users pick an LLM model from the frontend is a future enhancement.

---

# **Add Word Enrichment** {#add-word-enrichment}

## Approach Overview {#approach-overview}

The enrichment flow is triggered by a user clicking an "Enrich" button inside the word creation modal. The frontend sends the entered word string to a new `POST /words/enrich` endpoint on the FastAPI backend. The backend delegates the request to a PydanticAI agent, which calls an LLM via LiteLLM and coerces the output into a typed structure matching the `WordCreate` schema. The structured response is returned to the frontend, which uses it to pre-fill the remaining form fields. The user can review and adjust values before submitting the form normally.

The backend enrichment logic is isolated in its own module to keep it decoupled from the existing CRUD routes. LiteLLM acts as the provider abstraction so that model selection is controlled via environment configuration rather than hardcoded in application logic. The default target is the **Gemini Flash free tier** (via Google AI Studio), keeping the feature cost-free for personal use.

## Frontend Integration {#frontend-integration}

An "Enrich" button is added to the `AddWordModal` component. When clicked, it reads the current value of the word input field, issues a `POST /words/enrich` request with `{ word: "<value>" }`, and — on success — calls `setValue` (React Hook Form) for each returned field. The button is disabled while the request is in flight and shows a loading indicator. Error states surface as a toast or inline message without blocking form submission.

## Backend Enrichment Endpoint {#backend-enrichment-endpoint}

A new route `POST /words/enrich` is added to `main.py`. It accepts `{ word: str }` and returns a partial `WordRead`-compatible JSON object. The handler calls an `enrich_word(word: str) -> WordEnrichment` function defined in a new `enrichment.py` module. This function instantiates the PydanticAI agent, runs inference via LiteLLM, and validates the output against a `WordEnrichment` Pydantic model (a subset of `WordCreate` fields). Errors from the LLM layer are caught and returned as `422` responses with descriptive messages.

## Tech Stack {#tech-stack}

- **Python**: Backend language; used to implement the enrichment endpoint and PydanticAI agent.
- **PydanticAI**: LLM agent framework; enforces structured, typed output from the LLM that maps directly to existing Pydantic schemas.
- **LiteLLM**: Model provider abstraction; routes calls to the **Gemini Flash free tier** (Google AI Studio) by default, with the ability to swap providers via environment config without code changes.

## Effort Estimations {#effort-estimations}

Total estimated effort: **{N} sessions**.

| Milestone                   | Description                                                                           | Est. effort | GitHub Issue |
| :-------------------------- | :------------------------------------------------------------------------------------ | :---------- | :----------- |
| M1 — Backend enrichment API | Implement `POST /words/enrich` endpoint, PydanticAI agent, LiteLLM integration, tests | {N}         | #{issue}     |
| M2 — Frontend enrichment UI | Add "Enrich" button to `AddWordModal`, wire up API call, pre-fill form fields         | {N}         | #{issue}     |

### Recommended Order

1. M1 — Backend enrichment API (establishes the contract the frontend depends on)
2. M2 — Frontend enrichment UI (depends on M1 being stable and tested)

---

# **FAQs** {#faqs}

**Q: Why use PydanticAI instead of calling the LLM API directly?**

A: PydanticAI enforces a typed response schema at the agent level, eliminating ad-hoc JSON parsing and validation logic. Since the enriched data must conform to the existing `WordCreate` schema, having the agent validate output natively is simpler and more robust than post-processing raw LLM text.

**Q: Why Gemini Flash and not a paid model like GPT-4o?**

A: This is a personal project with no budget for inference costs. Gemini Flash is available on Google AI Studio's free tier with generous rate limits, and its instruction-following quality is sufficient for structured field extraction on short German words. LiteLLM makes it straightforward to upgrade to a paid model later if quality proves inadequate.

**Q: Why is enrichment of existing (already-saved) words out of scope?**

A: The edit flow has different UX considerations — partial overwrites, conflict resolution, audit trail — that add complexity disproportionate to the immediate need. Enrichment during creation covers the primary pain point and can be extended later.

**Q: What happens if the LLM returns an incorrect or incomplete response?**

A: PydanticAI will raise a validation error if required fields are missing or have invalid types. The endpoint catches this and returns a `422` with a descriptive message. The user's form state is unaffected — they can retry or fill fields manually.

**Q: Terminology?**

A: Terms used in this RFC:

- **LLM** → Large Language Model; the AI model used to generate word enrichment data.
- **PydanticAI** → A Python framework for building LLM agents with structured, Pydantic-validated outputs.
- **LiteLLM** → A Python library providing a unified interface to multiple LLM providers (OpenAI, Anthropic, etc.).
- **Enrichment** → The process of automatically populating word metadata fields (gender, category, translation, etc.) from a single word input via an LLM.

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question                                                       | Likelihood | Mitigation / Answer                                                                                       |
| :-------------------------------------------------------------------- | :--------- | :-------------------------------------------------------------------------------------------------------- |
| LLM returns plausible but incorrect German grammar data               | Medium     | Treat enriched values as suggestions; user must confirm before saving. Add a disclaimer in the UI.        |
| LLM API latency degrades form UX                                      | Medium     | Show a loading state on the Enrich button; set a reasonable timeout and surface a clear error on failure. |
| LiteLLM version incompatibility with PydanticAI                       | Low        | Pin both versions in `pyproject.toml`; verify compatibility in CI before merging.                         |
| Gemini Flash free-tier rate limits block enrichment during heavy use  | Low        | Personal usage is low-volume; add retry logic with exponential backoff. Document the limit in the README. |
| Scope of `WordEnrichment` schema diverges from `WordCreate` over time | Low        | Keep `WordEnrichment` as a strict subset of `WordCreate`; update it whenever `WordCreate` changes.        |

## References {#references}

- [PydanticAI documentation](https://ai.pydantic.dev/)
- [LiteLLM documentation](https://docs.litellm.ai/)
- [Notion initiative page](https://www.notion.so/ec2d1072f12045b4b6d46dceb5f1b7cd?v=33ad0937458546728e0a7c8743ea4010&p=2fe5cc6c0f078014a362e578a13f6a46&pm=s)
- [GitHub repo](https://github.com/Volscente/vademecum-germanicum)
