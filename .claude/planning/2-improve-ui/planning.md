# Improve UI — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [Milestone: Improve UI](https://github.com/Volscente/vademecum-germanicum/milestone/4)
**Notion page:** [2 — Improve UI](https://www.notion.so/2-Improve-UI-3575cc6c0f078023834df02a2390b410)
**Total estimated effort:** 1.5 FTE-days (1 FTE = 1 day)

---

## Overview

This initiative refines the visual presentation of the Vademecum Germanicum frontend without changing any feature behaviour. The work is split into two sequential layers: first, recalibrating the `forest-*` Tailwind v4 colour tokens in `globals.css` so dark mode uses deeper, less saturated greens (and fixing the flash-of-wrong-theme on first load); second, applying a consistent layout pass across all components and adding a logo to the app header. All changes are confined to `frontend/`; the FastAPI backend is untouched.

### Dependency Order

```txt
TASK-1 ──► TASK-2
```

TASK-2 consumes the stable palette tokens established in TASK-1, so the tasks must run in sequence.

---

## TASK-1 — Palette & Dark Mode Refinement

**GitHub Issue:** [Palette & Dark Mode Refinement](https://github.com/Volscente/vademecum-germanicum/issues/29)
**Effort estimate:** 0.5 FTE-days

### Scope

Recalibrate the `forest-*` colour scale in `src/app/globals.css` so dark-mode surfaces use the deeper end of the scale (`forest-800`/`forest-900` range) rather than the current bright neon greens (`forest-400`/`forest-500`). Audit every component for hard-coded dark-mode Tailwind classes and remap them to the adjusted tokens. Add an inline `<script>` to `src/app/layout.tsx` that reads `localStorage.theme` and sets `document.documentElement.classList` synchronously before React hydrates, eliminating the flash-of-wrong-theme (FOWT).

### Goal

Deliver a dark-mode palette that is visually comfortable (deep forest greens instead of neon) and loads without a colour-mode flicker. This establishes the colour foundation that TASK-2 components will consume.

### Deliverables

- `src/app/globals.css` — adjusted `forest-*` dark-mode token values
- `src/app/layout.tsx` — inline `<script>` for synchronous theme class application before hydration

### Technical Overview

The `forest-*` scale is defined as CSS custom properties inside a Tailwind v4 `@theme` block in `globals.css`. Dark-mode overrides use `dark:` prefix variants on Tailwind utility classes across all components. The token remap should only touch `dark:` variant references — light-mode tokens are left unchanged per the constraint. The FOWT fix is a small `<script dangerouslySetInnerHTML>` block placed inside `<head>` in `layout.tsx`; it reads `localStorage.getItem('theme')` and conditionally adds the `dark` class to `document.documentElement`. No React state is involved. Verify with browser devtools network throttled to 3G to confirm the flash is gone in both `next dev` and `next build && next start`.

---

## TASK-2 — Component Visual Refresh & Logo

**GitHub Issue:** [Component Visual Refresh & Logo](https://github.com/Volscente/vademecum-germanicum/issues/30)
**Effort estimate:** 1.0 FTE-days

### Scope

Apply a consistent layout pass to all existing frontend components: `WordTable`, `AddWordModal`, `EditWordModal`, `SearchBar`, and the top-level header in `page.tsx`. Apply `rounded-md` border radius uniformly, tighten padding, add clean `border` separators using remapped dark-mode tokens from TASK-1, and remove gradients and heavy shadows. Add a logo to the app header using either an inline SVG or an existing `lucide-react` icon — no new asset files or build-step changes.

### Goal

Deliver a visually clean, macOS/Linux-style UI across all components in both light and dark mode, with a logo in the header. All existing user flows (add word, enrich word, search, delete, toggle theme) must remain fully functional.

### Deliverables

- `src/components/WordTable.tsx` — updated row padding, header weight, border colour
- `src/components/AddWordModal.tsx` — updated container border radius, field spacing, button hierarchy
- `src/components/EditWordModal.tsx` — updated container border radius, field spacing, button hierarchy
- `src/components/SearchBar.tsx` — updated input border and focus ring style
- `src/app/page.tsx` — updated header with logo (inline SVG or `lucide-react` icon + styled `<span>`)

### Technical Overview

All style changes use Tailwind v4 utility classes; `clsx`/`tailwind-merge` remain the composition mechanism for conditional dark-mode variants. No new npm dependencies are introduced — `lucide-react` is already in the dependency graph. The logo must not introduce a `/public` asset or an `<Image>` component: it is either a `lucide-react` icon or a compact inline SVG (`<svg>` element, < 10 lines). Run `npm run lint` after all changes and manually verify all user flows in both light and dark mode before closing this task.

---

## GitHub Issues

### Milestone 1 — Palette & Dark Mode

**Tasks:** TASK-1
**Effort:** 0.5 FTE-days

#### Scope

Recalibrate the `forest-*` Tailwind v4 colour tokens in `globals.css` for dark mode, remap all affected component classes, and add a synchronous theme-class script to `layout.tsx` to eliminate the flash-of-wrong-theme on page load.

#### Goal

Dark mode displays deep, low-saturation forest greens with no colour-mode flicker on first load. The updated token set serves as the stable foundation for the component refresh in Milestone 2.

#### Deliverables

- Updated `forest-*` dark-mode token values in `src/app/globals.css`
- Remapped `dark:` Tailwind classes across all affected components
- Inline FOWT-fix script in `src/app/layout.tsx`

---

### Milestone 2 — Component Refresh & Logo

**Tasks:** TASK-2
**Effort:** 1.0 FTE-days

#### Scope

Apply a visual layout pass to `WordTable`, `AddWordModal`, `EditWordModal`, `SearchBar`, and the app header. Standardise border radius, tighten padding, clean up separators, and add a logo to the header using `lucide-react` or inline SVG.

#### Goal

All components present a clean, macOS/Linux-style appearance in both light and dark mode. A logo is visible in the header. Every existing user flow remains fully functional and passes lint.

#### Deliverables

- Refreshed `src/components/WordTable.tsx`
- Refreshed `src/components/AddWordModal.tsx`
- Refreshed `src/components/EditWordModal.tsx`
- Refreshed `src/components/SearchBar.tsx`
- Updated `src/app/page.tsx` header with logo
