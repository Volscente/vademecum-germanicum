# Improve Word Form UX Buttons — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [6-improve-word-form-buttons-ux](https://github.com/Volscente/vademecum-germanicum/milestone/8)
**Notion page:** [6 – Improve Word Form Buttons UX](https://www.notion.so/6-Improve-Word-Form-Buttons-UX-36b5cc6c0f07809f9545cc079514f757)
**Total estimated effort:** 0.5 FTE-days (1 FTE = 1 day)

---

## Overview

This initiative refactors `EditWordModal.tsx` to pin the action buttons ("Delete Word", "Cancel", "Save Changes") in a sticky footer so they remain visible regardless of scroll position, and adds an ESC keyboard shortcut that calls `onClose()`. Both changes are fully contained within `EditWordModal.tsx`; no backend code, API contracts, or parent components (`page.tsx`, `WordTable.tsx`) are modified.

### Dependency Order

```txt
TASK-1
```

---

## TASK-1 — Sticky Footer & ESC Shortcut

**GitHub Issue:** #67
**Effort estimate:** 0.5 FTE-days

### Scope

Restructure the `EditWordModal.tsx` layout into a `flex flex-col` container capped at `max-h-[90vh]`. Wrap all form fields in a `flex-1 overflow-y-auto` scrollable region. Extract the three action buttons into a `sticky bottom-0` footer div with a `border-t` separator. Add a `useEffect` that attaches and cleans up a `document` `keydown` listener to call `onClose()` when `event.key === 'Escape'` and `isOpen === true`.

### Goal

Users can always reach the action buttons without scrolling, regardless of how many Sense cards are expanded. Pressing ESC closes the modal as a keyboard-native alternative to clicking "Cancel". All existing behavior — form validation, save, delete, Re-enrich, collapsible cards — is preserved unchanged.

### Deliverables

- `frontend/src/components/EditWordModal.tsx` — layout refactored to sticky-footer flex-column; ESC `useEffect` added

### Technical Overview

The outer modal container becomes `flex flex-col max-h-[90vh]`. The scrollable body div gets `flex-1 overflow-y-auto`; this operates at a higher DOM level than the inner `max-h` + `overflow-y-auto` toggles on collapsible Verb Morphology and Sense cards, so those inner scroll contexts are unaffected. The footer div uses `sticky bottom-0` with `border-t` and the modal background color to prevent content bleed-through on scroll. The `useEffect` for ESC is gated on `isOpen` and returns a cleanup that calls `removeEventListener`, ensuring the handler is torn down when the modal closes or the component unmounts. No new npm dependencies are introduced; only existing Tailwind v4 utilities and native browser APIs are used.

---

## GitHub Issues

### Milestone 1 — Sticky Footer & ESC Shortcut

**Tasks:** TASK-1
**Effort:** 0.5 FTE-days

#### Scope

Single self-contained refactor of `EditWordModal.tsx`: introduce a flex-column layout with a sticky action button footer and a `useEffect`-based ESC keyboard shortcut.

#### Goal

The modal's action buttons are always visible and reachable via keyboard shortcut, eliminating the need to scroll to the bottom of a long form. The component's public interface and all existing behavior remain unchanged.

#### Deliverables

- `frontend/src/components/EditWordModal.tsx` with sticky footer layout
- ESC keydown listener via `useEffect` (attaches on open, cleans up on close/unmount)
