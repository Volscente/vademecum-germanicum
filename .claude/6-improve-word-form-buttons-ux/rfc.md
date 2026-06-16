# [RFC] Improve Word Form UX Buttons — Vademecum Germanicum

| Author          | Simone Porreca                                                                                  |
| :-------------- | :---------------------------------------------------------------------------------------------- |
| **Project**     | Vademecum Germanicum                                                                            |
| **RFC status**  | Draft                                                                                           |
| **Review deadline** | 2026-05-25                                                                                  |
| **Notion page** | [6 – Improve Word Form Buttons UX](https://www.notion.so/6-Improve-Word-Form-Buttons-UX-36b5cc6c0f07809f9545cc079514f757) |
| **GitHub repo** | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)             |
| **Milestone**   | [6-improve-word-form-buttons-ux](https://github.com/Volscente/vademecum-germanicum/milestone/8) |

### Timeline

| Date       | Status | Note  |
| :--------- | :----- | :---- |
| 2026-05-25 | Draft  |       |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Improve Word Form UX Buttons](#improve-word-form-ux-buttons)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The `EditWordModal` component renders all form fields — word metadata, optional Verb Morphology card, and a variable number of collapsible Sense cards — in a single scrolling container, with the "Delete Word", "Cancel", and "Save Changes" action buttons appended at the very bottom. On any form with more than a few senses the user must scroll past all content just to dismiss the modal, creating unnecessary friction for the most frequent actions. For full context, see the [Notion initiative page](https://www.notion.so/6-Improve-Word-Form-Buttons-UX-36b5cc6c0f07809f9545cc079514f757).

## Objectives {#objectives}

- **Pin action buttons**: The "Delete Word", "Cancel", and "Save Changes" buttons are always visible at the bottom of the modal, regardless of how far the user has scrolled into the form.
- **Enable ESC shortcut**: Pressing Escape while the modal is open closes it, providing the same effect as clicking "Cancel" without requiring mouse interaction.
- **Preserve all existing behavior**: Form validation, save, delete, Re-enrich, and the collapsible Verb Morphology and Sense cards continue to work exactly as before.
- **Maintain unchanged public interface**: `page.tsx` and `WordTable.tsx` require no edits; the component's props signature (`word`, `isOpen`, `onClose`, `onWordDeleted`, `onWordUpdated`) is unchanged.

## Scope {#scope}

**In-Scope:**

- Refactor UX Word Form Buttons in `EditWordModal.tsx` (sticky footer layout + ESC keyboard shortcut)

**Out-of-Scope:**

- **Change backend logic for Word Form buttons**: This initiative is a purely frontend UX change; no API routes, schemas, or database logic are affected.

**Constraints:**

- Must not modify backend logic or API contracts.
- Must preserve the existing `react-hook-form` + Zod validation pipeline (`wordSchema` as single source of truth).
- Must not break the `onWordDeleted` and `onWordUpdated` callbacks consumed by `WordTable` and `page.tsx`.
- No new npm dependencies; only native browser APIs, existing Tailwind v4 utilities, and React hooks already in use.

---

# **Improve Word Form UX Buttons** {#improve-word-form-ux-buttons}

## Approach Overview {#approach-overview}

Two complementary changes, both fully contained within `EditWordModal.tsx`.

**Sticky action bar.** The modal's top-level layout is restructured as a `flex flex-col` container capped at a viewport-relative max-height (e.g. `max-h-[90vh]`). The form-field area — word metadata, Verb Morphology card, and Sense cards — becomes a `flex-1 overflow-y-auto` scrollable region. The action button row ("Delete Word", "Cancel", "Save Changes") is extracted into a separate `sticky bottom-0` footer div styled with a top border and background fill so it floats above the scrollable content with a clear visual separator.

**ESC key shortcut.** A `useEffect` inside `EditWordModal` attaches a `keydown` listener to `document` when `isOpen === true`. When `event.key === 'Escape'` fires the handler calls `onClose()`. The effect's cleanup function removes the listener, so it is torn down whenever `isOpen` flips to `false` or the component unmounts.

The proposal's stated approach direction is adopted without change: both complementary techniques are the minimal, correct solution given the constraints and the existing architecture.

### Integration {#integration}

`EditWordModal.tsx` is entirely self-contained for this initiative. Its public interface — `word`, `isOpen`, `onClose`, `onWordDeleted`, `onWordUpdated` — is unchanged, so `WordTable.tsx` (which opens the modal on row click) and `page.tsx` (which owns modal state and passes the callbacks) require no edits.

The collapsible Verb Morphology and Sense cards already use a CSS `max-h` + `overflow-y-auto` toggle to expand/collapse while keeping fields mounted for `react-hook-form` registration. The new outer `overflow-y-auto` wrapping the form body operates at a higher DOM level and does not interfere with these inner overflow contexts, because CSS overflow is scoped to the nearest scrolling ancestor.

## M1 — Sticky Footer & ESC Shortcut {#m1}

Restructure `EditWordModal.tsx` layout as `flex flex-col` with `max-h-[90vh]`. Wrap all form fields in a `flex-1 overflow-y-auto` div. Move the three action buttons into a `sticky bottom-0` footer div with a `border-t` separator and the same background color as the modal body (to prevent content bleeding through on scroll). Add a `useEffect` that registers and cleans up the `keydown` → `onClose` listener conditioned on `isOpen`.

## Tech Stack {#tech-stack}

- **Next.js / React**: The existing framework; `useEffect` and `useRef` are the only React primitives added.
- **Tailwind CSS v4**: `flex`, `flex-col`, `flex-1`, `overflow-y-auto`, `max-h-[90vh]`, `sticky`, `bottom-0`, `border-t` — all existing utilities in the project's Tailwind v4 setup; no new configuration required.
- **Native browser API (`addEventListener`)**: Used for the `keydown` ESC listener; no third-party keyboard library needed.

## Effort Estimations {#effort-estimations}

Total estimated effort: **0.5 session**.

| Milestone                          | Description                                                                              | Est. effort | GitHub Issue |
| :--------------------------------- | :--------------------------------------------------------------------------------------- | :---------- | :----------- |
| M1 — Sticky Footer & ESC Shortcut | Refactor modal layout to flex-column, extract sticky footer, add ESC keydown useEffect  | 0.5 session   | #67     |

### Recommended Order

1. M1 — Sticky Footer & ESC Shortcut (self-contained; no prerequisites)

---

# **FAQs** {#faqs}

**Q: Why a sticky footer inside the modal rather than a fixed-position overlay?**

A: A `sticky bottom-0` element inside the flex-column modal container stays within the modal's stacking context and scrolls with the modal if the modal itself is repositioned. A `fixed` overlay would escape the modal's DOM subtree, making z-index management fragile and breaking if the modal is ever animated or transformed. Sticky is the simpler, safer choice here.

**Q: Why attach the ESC listener to `document` via `useEffect` rather than using `onKeyDown` on the modal `div`?**

A: `onKeyDown` on a div only fires when that div (or a descendant) has focus. If the user clicks outside an input but inside the modal, focus may sit on the modal container itself, which is not always focusable. A `document`-level listener with an `isOpen` guard is more reliable and matches the pattern commonly used in React modals; the `isOpen` condition ensures the listener is only active when the modal is visible.

**Q: Why are no changes made to `AddWordModal.tsx`?**

A: The scope of this initiative is explicitly limited to the edit form, where the UX problem is most acute (multiple collapsible Sense cards produce a long scroll). `AddWordModal` has a shorter, more predictable layout. Applying the same treatment to `AddWordModal` is a candidate for a follow-up task.

**Q: Could the sticky footer accidentally obscure form content on small screens?**

A: Yes — a sticky footer reduces the scrollable viewport height, which is the main small-screen risk (see Risks section). The mitigation is to ensure the scrollable body has an adequate `min-height` and the footer has a clear visual separator (border or shadow), so users understand that content continues above.

**Q: Terminology?**

A: No acronyms specific to this RFC. Standard terms:

- **RHF** → React Hook Form — form-state management library used by both modals
- **UX** → User Experience — the quality of the interaction from the user's perspective

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question                                   | Likelihood | Mitigation / Answer                                                                                                                                                                     |
| :------------------------------------------------ | :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small-screen overlap: sticky footer reduces visible form area on short viewports | Medium     | Ensure the scrollable body has a `min-height` and the footer has a `border-t` separator; test at common mobile breakpoints before merging.                                              |
| ESC conflicts with nested browser-native elements | Low        | `EditWordModal` is a custom div-based modal (not `<dialog>`), so no native ESC interception exists. Verify during implementation that no nested `<dialog>` or third-party overlay is introduced. |
| Focus trap: global `keydown` fires even when focus is outside the modal | Low–Medium | The `isOpen` guard prevents the listener from being active when the modal is closed. For stricter safety, add a `document.activeElement` check or use a `ref` on the modal container to verify focus containment before calling `onClose`. |
| CSS overflow stacking with collapsible inner cards | Low        | The inner `max-h` + `overflow-y-auto` toggles operate on child elements; the new outer scroll wrapper is at a higher DOM level and does not share the same overflow ancestor. Verify visually that collapsed/expanded cards still animate correctly after layout refactor. |

## References {#references}

- [MDN: CSS `position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)
- [MDN: `EventTarget.addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [Tailwind CSS v4 — Overflow utilities](https://tailwindcss.com/docs/overflow)
