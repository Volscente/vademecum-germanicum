---
title: "Improve Word Form UX Button"
project: "Vademecum Germanicum"
author: "Simone Porreca"
deadline: "2026-05-25"
notion-page: "https://www.notion.so/6-Improve-Word-Form-Buttons-UX-36b5cc6c0f07809f9545cc079514f757"
github-repo: "https://github.com/Volscente/vademecum-germanicum"
milestone: [6-improve-word-form-buttons-ux](https://github.com/Volscente/vademecum-germanicum/milestone/8)
tech-stack:
  - "Next.js"
scope-in:
  - "Refactor UX Word Form Buttons"
scope-out:
  - "Change backend logic for Word Form buttons"
milestones:
  - ""
context-paths:
  - "frontend/README.md"
---

## Problem

The Word Form in the Word Table has now the “Delete Words”, “Cancel” and “Save Changes” buttons at the very end of the form. The user has to scroll all the way down even just to close the Word Form. We would like to make this UX faster and smoother.

## Approach direction

Two complementary changes, both confined to `EditWordModal.tsx`:

1. **Sticky action bar**: Restructure the modal's layout as a flex column — scrollable body for form fields, sticky footer pinned to the bottom containing the "Delete Word", "Cancel", and "Save Changes" buttons. The modal already uses `isOpen` / `onClose` / `onWordDeleted` / `onWordUpdated` props, so no interface changes are needed.

2. **ESC key shortcut**: Add a `useEffect` inside `EditWordModal` that attaches a `keydown` listener when `isOpen === true` and calls `onClose` on `Escape`. The listener is cleaned up when the modal closes or the component unmounts.

## Success criteria

- The "Delete Word", "Cancel", and "Save Changes" buttons are always visible without scrolling, regardless of form length.
- Pressing ESC while the modal is open closes it (equivalent to clicking "Cancel").
- All existing behaviour — validation, save, delete, re-enrich, collapsible Verb Morphology and Sense cards — remains intact.
- No backend changes required.

## Constraints

- Must not modify backend logic or API contracts.
- Must preserve the existing `react-hook-form` + Zod validation pipeline (`wordSchema` as single source of truth).
- Must not break the `onWordDeleted` and `onWordUpdated` callbacks consumed by `WordTable` and `page.tsx`.

## Desired tech

No new dependencies. The solution uses only native browser APIs (`addEventListener`), existing Tailwind v4 utility classes (`sticky`, `bottom-0`, `flex`, `overflow-y-auto`), and React's `useEffect` hook — all already present in the project.

## Integration context

All changes are isolated to `frontend/src/components/EditWordModal.tsx`. The component's public interface (`word`, `isOpen`, `onClose`, `onWordDeleted`, `onWordUpdated`) does not change, so `page.tsx` and `WordTable.tsx` require no edits.

## Known risks / concerns

- **Small-screen overlap**: A sticky footer reduces the visible form area on short viewports. Mitigate by ensuring the scrollable body has enough `min-height` and the footer has a clear visual separator (border or shadow).
- **ESC conflicts**: If a nested element (e.g., a browser-native `<dialog>`) already handles ESC, adding a manual listener could double-fire. Since `EditWordModal` is a custom div-based modal (not `<dialog>`), this is unlikely but worth verifying during implementation.
- **Focus trap**: ESC should close the modal only when focus is inside it; a global listener would also fire if the user presses ESC while focused elsewhere on the page. The `isOpen` guard partially mitigates this, but a more robust solution would check `document.activeElement` is within the modal.
