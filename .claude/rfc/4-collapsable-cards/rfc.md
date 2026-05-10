# [RFC] Collapsible UI Components for Word Management — Vademecum Germanicum

| Author              | Simone Porreca                                                                                                         |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| **Project**         | Vademecum Germanicum                                                                                                   |
| **RFC status**      | Draft                                                                                                                  |
| **Review deadline** | 2026-05-12                                                                                                             |
| **Notion page**     | [4-Collapsable Cards](https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375)                     |
| **GitHub repo**     | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)                                    |
| **Milestone**       | [Milestone: 4-collapsable-cards](https://github.com/Volscente/vademecum-germanicum/milestone/4-collapsable-cards)      |

### Timeline

| Date       | Status | Note |
| :--------- | :----- | :--- |
| 2026-05-10 | Draft  |      |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Collapsible UI Components for Word Management](#collapsible-ui-components-for-word-management-1)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The `EditWordModal` component presents all word data — basic details, verb morphology, and one or more Senses — in a single uninterrupted form, forcing the user to scroll through every section regardless of which part they actually need to inspect or edit. As the sense graph grows (multiple Senses, each with grammar patterns and example sentences), the modal becomes increasingly unwieldy, making it hard to quickly scan the word's data or locate a specific field without being distracted by secondary grammatical detail. Introducing per-card collapse behavior allows users to condense sections they are not currently editing into a single-line summary, reducing visual noise without hiding critical identification data. For full context, see the [Notion initiative page](https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375).

## Objectives {#objectives}

- **Enable per-card toggling**: Users can expand or collapse the Verb Morphology card and each individual Sense card independently with a single click on its header.
- **Surface inline summaries**: Collapsed headers display a real-time summary derived from current form state — principal forms for Verb Morphology, Meaning Summary for each Sense — so the word remains readable without expanding every section.
- **Hide absent cards**: The Verb Morphology card is not rendered when the word's category is not `verb`, eliminating empty sections for non-verb entries.
- **Preserve form integrity**: All fields remain registered with react-hook-form regardless of collapsed state; a visible error indicator on the collapsed header surfaces validation failures without requiring the user to expand every card.
- **Provide a global collapse control**: A single "Collapse All" button in the modal header condenses every collapsible card simultaneously.

## Scope {#scope}

**In-Scope:**

- Interactive toggle functionality for the Verb Morphology card
- Independent toggle functionality for each Sense X card
- Summary view logic for collapsed Verb Morphology (Infinitiv, Präteritum, Partizip II)
- Summary view logic for collapsed Senses (Meaning Summary)
- Conditional rendering to hide the Verb Morphology card if no data is present (word category ≠ verb)
- Global "Collapse All" button for every card

**Out-of-Scope:**

- **Drag-and-drop reordering of senses**: out of scope

**Constraints:**

- The collapsed header must always display critical identification info — Meaning Summary for Senses; Infinitiv, Präteritum, Partizip II for Verb Morphology — these values must never be hidden.
- The implementation must handle a dynamic number of Sense cards (Sense 1, Sense 2, …) driven by `useFieldArray`.

---

# **Collapsible UI Components for Word Management** {#collapsible-ui-components-for-word-management-1}

## Approach Overview {#approach-overview}

All collapsible behavior is scoped entirely to `EditWordModal.tsx`. Two pieces of local React state track collapse status: a single `boolean` (`verbMorphologyCollapsed`) for the Verb Morphology card, and a `boolean[]` (`sensesCollapsed`) with one entry per sense, kept parallel to the `useFieldArray` `fields` array. Collapse and expand is implemented as a CSS-only toggle — adding `max-h-0 overflow-hidden` to the card body — so fields remain mounted in the DOM and stay registered with react-hook-form. Validation continues to fire for hidden fields, and a `formState.errors` check on the collapsed header exposes failures to the user. The collapsed header reads current field values via `useWatch`, so summary text updates in real-time as the user types without triggering a full form re-render.

The author's proposed accordion-style direction is adopted in full with one deliberate refinement: fields are kept mounted (CSS-only hide) rather than unmounted on collapse. This ensures react-hook-form registration is preserved and validation errors in collapsed sections are caught before submission — a stated constraint. Framer Motion is noted as a desired option for animated height transitions, but is not introduced as a new dependency here: a CSS `transition-[max-height]` with a generous fixed upper bound achieves equivalent visual behavior with tools already in the stack.

### Integration with EditWordModal {#integration-with-editwordmodal}

`EditWordModal.tsx` is the sole integration point. No changes are required to `wordSchema.ts`, `api.ts`, `types/word.ts`, or any other component. The specific additions to `EditWordModal`:

1. **State additions** — `verbMorphologyCollapsed: boolean` (default `false`) and `sensesCollapsed: boolean[]` (default all `false`, sized to `fields.length`). A `useEffect` dependent on `fields.length` keeps `sensesCollapsed` in sync when senses are appended or removed.
2. **"Collapse All" button** — placed in the modal header row alongside existing controls; sets `verbMorphologyCollapsed = true` and every `sensesCollapsed` entry to `true`.
3. **Card header pattern** — each collapsible card gets a header row containing: a `ChevronDown`/`ChevronUp` icon (already available via `lucide-react`), the card title, the summary text, and an optional error badge. For Verb Morphology, summary = `watch('principal_forms')` formatted as `"Infinitiv, Präteritum, Partizip II"` (placeholder `"—"` when empty). For Sense N, summary = `` watch(`senses.${n}.meaning_summary`) `` (placeholder `"No summary yet"` when empty).
4. **Error indicator** — when `formState.errors` contains a key nested under a collapsed card (e.g., `errors.senses?.[n]` or `errors.principal_forms`), the collapsed header shows a small red dot so the user knows to expand that card before saving.
5. **Conditional rendering** — the Verb Morphology card is wrapped in `{watch('category') === 'verb' && …}`, using the category field already present in the form.

## Milestone 1 — Collapsible Verb Morphology Card {#milestone-1}

Introduce `verbMorphologyCollapsed` state and the card header toggle for the Verb Morphology section. Add conditional rendering so the card is not shown when `category !== 'verb'`. Implement the collapsed summary header reading `principal_forms` via `useWatch`. Add the error indicator for this card.

## Milestone 2 — Collapsible Sense Cards {#milestone-2}

Introduce `sensesCollapsed: boolean[]` parallel to the `useFieldArray` `fields` array. Wrap each Sense card with an independent toggle. Implement the collapsed summary header reading `senses.N.meaning_summary` via `useWatch`. Sync `sensesCollapsed` with `fields` via `useEffect`. Add the error indicator for each Sense card.

## Milestone 3 — Global "Collapse All" Button {#milestone-3}

Add the "Collapse All" button to the modal header. When clicked, set `verbMorphologyCollapsed = true` and all `sensesCollapsed` entries to `true`. No new state is required; this milestone composes what M1 and M2 introduced.

## Tech Stack {#tech-stack}

- **react-hook-form (`useWatch`, `useFieldArray`, `formState.errors`)**: Already in use in `EditWordModal.tsx`. `useWatch` provides reactive field reads for real-time summary text; `formState.errors` drives the collapsed error indicator without any additional state.
- **Tailwind CSS v4 (`transition-[max-height]`, `overflow-hidden`, `max-h-0`)**: Already in the stack. CSS max-height transitions on the card body deliver smooth collapse/expand with zero new dependencies.
- **lucide-react (`ChevronDown`, `ChevronUp`)**: Already imported in the project for existing icons (Search, Trash2, Sparkles). Used for the toggle affordance on each card header.
- **clsx / tailwind-merge**: Already used for conditional class merging throughout the frontend; applied to card bodies to toggle collapsed classes.

**Desired / experimental:**

- **Framer Motion** — identified by the author as a potential option for spring-based height animations. Not introduced in this RFC since the CSS transition approach satisfies the requirement with no new dependency; Framer Motion remains an upgrade path if the animation feel is later deemed insufficient.
- **Local component state (`useState`)** — confirmed as appropriate here; no global store is needed since collapse state is ephemeral UI state relevant only within the open modal session.

## Effort Estimations {#effort-estimations}

Total estimated effort: **2.5 sessions**.

| Milestone                             | Description                                                                              | Est. effort  | GitHub Issue |
| :------------------------------------ | :--------------------------------------------------------------------------------------- | :----------- | :----------- |
| M1 — Collapsible Verb Morphology Card | Toggle state, CSS collapse, summary header, conditional rendering, error indicator       | 1 session    | #47{issue}     |
| M2 — Collapsible Sense Cards          | Per-sense boolean array, useEffect sync, summary headers, per-card error indicators      | 1 session    | #48{issue}     |
| M3 — Global "Collapse All" Button     | Modal header button, bulk state update for all cards                                     | 0.5 sessions | #49{issue}     |

### Recommended Order

1. M1 — Collapsible Verb Morphology Card (simpler single-boolean case; validates the card header pattern before scaling to the array)
2. M2 — Collapsible Sense Cards (builds directly on M1's pattern; introduces dynamic array complexity)
3. M3 — Global "Collapse All" Button (trivial once M1 and M2 state is in place)

---

# **FAQs** {#faqs}

**Q: Why keep collapsed fields mounted in the DOM rather than unmounting them?**

A: react-hook-form registers fields by name at mount time. If a field unmounts (because a card collapses), its registration is dropped — it is excluded from the submitted payload and from validation runs. Since a stated constraint is that hidden fields must still fail validation, fields must remain mounted. CSS-only hiding (`max-h-0 overflow-hidden`) achieves the visual collapse without unmounting, at the cost of slightly more DOM nodes — acceptable for this modal size.

**Q: How does a user know a collapsed section contains a validation error?**

A: The collapsed card header will display a small red error badge when `formState.errors` contains at least one key nested under that card (e.g., `errors.senses?.[0]?.meaning_summary` for Sense 1, `errors.principal_forms` for Verb Morphology). The badge makes the failure visible without forcing the user to expand every section to hunt for red fields.

**Q: Why use a parallel `boolean[]` for senses instead of a `Map<string, boolean>` keyed by the field's stable ID?**

A: Collapse state is purely ephemeral UI state. A parallel array keeps the implementation simple and avoids reconciling a Map with `useFieldArray` mutations (append/remove shift indices). The `useEffect` sync resets the array to the correct length on every change to `fields.length`, which is the only invariant that needs to hold.

**Q: What happens to collapse state when Re-enrich replaces all senses?**

A: Re-enrich calls `reset()` on the form, which triggers `useFieldArray` to repopulate `fields`. The `useEffect` watching `fields.length` will resize `sensesCollapsed` to all `false`, effectively expanding every Sense card. This is the correct behavior — the user should review newly populated data.

**Q: Terminology?**

A:

- **Sense** → A distinct meaning of the word, containing a Meaning Summary, grammar patterns, and example sentences. A word may have multiple Senses (Sense 1, Sense 2, …).
- **Verb Morphology** → The form section containing `auxiliary_verb` and `principal_forms`; only shown when `category === "verb"`.
- **Principal Forms** → The three conjugated forms that identify a German verb: Infinitiv, Präteritum, Partizip II (e.g., "abdrehen, drehte ab, abgedreht").
- **RHF** → react-hook-form, the form state and validation library used in both `AddWordModal` and `EditWordModal`.

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question                                                                                                          | Likelihood | Mitigation / Answer                                                                                                                                                                     |
| :----------------------------------------------------------------------------------------------------------------------- | :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collapsed header looks empty if Principal Forms or Meaning Summary are not yet filled                                    | High       | Show a styled placeholder string (`"—"` for principal forms, `"No summary yet"` for senses) in the collapsed header when the watched value is empty or undefined.                       |
| Validation errors in a collapsed section are invisible, potentially confusing the user after a failed save               | Medium     | Render a red error badge on the collapsed header keyed to `formState.errors`; consider auto-expanding cards that contain errors when the user attempts to submit.                       |
| `sensesCollapsed` array goes out of sync with `fields` after rapid append/remove operations                              | Low        | `useEffect` dependent on `fields.length` resets the array on every length change: truncate on remove, push `false` on append.                                                          |
| CSS `max-height` transition requires a hardcoded upper bound and may clip very tall Sense cards with many grammar entries | Low        | Use a generous bound (e.g., `max-h-[2000px]`) with a moderate transition duration; revisit if clipping is observed in practice after implementation.                                    |

## References {#references}

- [react-hook-form — useWatch](https://react-hook-form.com/docs/usewatch)
- [react-hook-form — useFieldArray](https://react-hook-form.com/docs/usefieldarray)
- [Notion Initiative Page](https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375)
