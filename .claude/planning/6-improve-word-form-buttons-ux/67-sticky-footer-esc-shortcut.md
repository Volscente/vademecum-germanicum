# #67: Sticky Footer & ESC Shortcut

**GitHub Issue:** [#67 — Sticky Footer & ESC Shortcut](https://github.com/Volscente/vademecum-germanicum/issues/67)
**GitHub Milestone:** [6-improve-word-form-buttons-ux](https://github.com/Volscente/vademecum-germanicum/milestone/8)
**Notion page:** [6 – Improve Word Form Buttons UX](https://www.notion.so/6-Improve-Word-Form-Buttons-UX-36b5cc6c0f07809f9545cc079514f757)

---

## Technical Scope

**In scope:**

- `frontend/src/components/EditWordModal.tsx` — Refactor top-level layout to `flex flex-col max-h-[90vh]`; wrap all form fields in a `flex-1 overflow-y-auto` scrollable region; extract the three action buttons into a `sticky bottom-0` footer div with `border-t` separator; add `useEffect` for ESC keydown listener

**Out of scope:**

- Backend routes, schemas, or database logic — purely frontend change
- `frontend/src/app/page.tsx` and `frontend/src/components/WordTable.tsx` — public interface of `EditWordModal` is unchanged; these files require no edits
- `frontend/src/components/AddWordModal.tsx` — out of scope per RFC; follow-up candidate only

---

## Architecture

```txt
EditWordModal (flex flex-col, max-h-[90vh])
    │
    ├── Scrollable body (flex-1, overflow-y-auto)
    │       ├── Word metadata fields
    │       ├── Verb Morphology card (collapsible, max-h CSS toggle)  ← unchanged inner scroll
    │       └── Sense cards × N  (collapsible, max-h CSS toggle)      ← unchanged inner scroll
    │
    └── Sticky footer (sticky bottom-0, border-t)
            ├── Delete Word button  → onWordDeleted()
            ├── Cancel button       → onClose()
            └── Save Changes button → handleSubmit()

useEffect([isOpen, onClose])
    │  isOpen=true  → document.addEventListener('keydown', handleKeyDown)
    │  isOpen=false → cleanup: document.removeEventListener('keydown', handleKeyDown)
    └── handleKeyDown: event.key === 'Escape' → onClose()
```

### Why `sticky` instead of `fixed` for the footer

`sticky bottom-0` keeps the footer inside the modal's DOM subtree and stacking context. A `fixed` element would escape the subtree, making z-index management fragile and breaking if the modal ever uses a CSS transform or animation.

### Why `document`-level listener instead of `onKeyDown` on the modal div

`onKeyDown` on a div only fires when that div or a descendant holds focus. A `document`-level listener with an `isOpen` guard is more reliable — it fires regardless of where focus sits within the open modal.

---

## Tech Stack

No new packages required.

All changes use only:

- Existing Tailwind v4 utilities (`flex`, `flex-col`, `flex-1`, `overflow-y-auto`, `max-h-[90vh]`, `sticky`, `bottom-0`, `border-t`)
- React's `useEffect` hook (already imported in `EditWordModal.tsx`)
- Native browser API (`document.addEventListener` / `document.removeEventListener`)

---

## Implementation Details

### Modules / Files

| File                                              | Action | Description                                                                 |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `frontend/src/components/EditWordModal.tsx`       | Modify | Refactor layout to sticky-footer flex-column; add ESC keydown `useEffect`   |

---

### Key Changes

**1 — Outer container: add `flex flex-col max-h-[90vh]`**

The modal's top-level `div` (the white card rendered inside the backdrop overlay) gains `flex flex-col max-h-[90vh]`. This caps the modal height at 90% of the viewport and establishes the flex column that the scrollable body and sticky footer participate in.

**2 — Scrollable body: wrap form fields with `flex-1 overflow-y-auto`**

All form fields (word metadata inputs, Verb Morphology card, Sense cards) are wrapped in a single `div` with `flex-1 overflow-y-auto`. `flex-1` lets this region expand to fill available space between the header (if any) and the sticky footer. `overflow-y-auto` enables scrolling when content overflows.

The inner `max-h` + `overflow-y-auto` CSS toggles used by the collapsible Verb Morphology and Sense cards operate on child elements. The new outer scroll wrapper is at a higher DOM level and does not share the same overflow ancestor, so collapsed/expanded card animations are unaffected.

**3 — Sticky footer: extract action buttons**

The three action buttons ("Delete Word", "Cancel", "Save Changes") are moved out of the scrollable body into a new `div` positioned after it:

```tsx
<div className="sticky bottom-0 border-t border-forest-200 bg-white dark:bg-gray-900 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
  {/* Delete Word */}
  {/* Cancel */}
  {/* Save Changes */}
</div>
```

The `bg-white` / `dark:bg-gray-900` fill prevents form content from bleeding through on scroll. The `border-t` provides a clear visual separator.

**4 — ESC shortcut: `useEffect` keydown listener**

```tsx
useEffect(() => {
  if (!isOpen) return;
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

The effect is gated on `isOpen` so the listener is only active when the modal is visible. The cleanup function is returned unconditionally and removes the listener when `isOpen` flips to `false` or the component unmounts.

---

### Testing Strategy

**Manual browser tests (golden path):**

1. Open `EditWordModal` on a word with multiple Sense cards
2. Scroll the form — verify the "Delete Word", "Cancel", "Save Changes" buttons remain pinned at the bottom
3. Press ESC while the modal is open — verify the modal closes without submitting
4. Click "Cancel" — verify the modal closes (unchanged behavior)
5. Submit a valid form via "Save Changes" — verify `onWordUpdated` fires and data is persisted
6. Submit an invalid form — verify Zod validation errors appear and the form does not close

**Edge cases:**

- Word with 0 Sense cards (short form) → footer still renders; no layout breakage
- Word with 5+ Sense cards fully expanded (long form) → scrollable body scrolls independently; footer stays pinned
- Pressing ESC with a nested input focused (e.g. a text field inside a Sense card) → modal closes correctly
- Pressing ESC when modal is closed (`isOpen = false`) → listener not attached; no action

**Regression checks:**

- Collapsible Verb Morphology card expands/collapses with correct animation after layout refactor
- Collapsible Sense cards expand/collapse independently
- Re-enrich button still resets form fields via `reset()`
- Delete Word still fires `onWordDeleted` and closes modal
- Dark mode: footer background matches modal body in both light and dark themes

---

### Open Questions / Risks

- [x] **Small-screen overlap:** Sticky footer reduces visible form area on short viewports (mobile). Ensure the scrollable body has adequate `min-height` and the footer's `border-t` separator is clearly visible. **Target:** verify at 375 px viewport width before merging. **Answer:** Verify during UAT.
- [x] **Focus trap:** Global `keydown` listener fires even if focus is outside the modal (e.g. user opens browser devtools while modal is open). The `isOpen` guard partially mitigates this. For stricter safety, optionally add `document.activeElement` containment check inside `handleKeyDown`. **Target:** assess during implementation; add containment check only if test reveals a real false-positive. **Answer:** Verify during UAT.
- [x] **ESC conflicts with nested elements:** `EditWordModal` is a custom div-based modal (not `<dialog>`), so no native ESC interception is expected. Verify during implementation that no nested `<dialog>` or third-party overlay is introduced that would double-fire. **Target:** implementation review. **Answer:** Verify during UAT.
