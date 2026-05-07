# #29: Palette & Dark Mode Refinement

**GitHub Issue:** [#29 — Palette & Dark Mode Refinement](https://github.com/Volscente/vademecum-germanicum/issues/29)
**GitHub Milestone:** [Milestone: Improve UI](https://github.com/Volscente/vademecum-germanicum/milestone/4)
**Notion page:** [2 — Improve UI](https://www.notion.so/2-Improve-UI-3575cc6c0f078023834df02a2390b410)

---

## Technical Scope

**In scope:**

- `frontend/src/app/globals.css` — audit; likely no token value changes needed (scale is correct), but the `--background`/`--foreground` `.dark` overrides may be supplemented
- `frontend/src/app/page.tsx` — remap `dark:text-forest-300` (subtitle) and `dark:text-forest-400` (loading/empty text)
- `frontend/src/components/WordTable.tsx` — remap `dark:text-forest-300` (word, translation), `dark:text-forest-500` (gender, date), `dark:text-forest-200` (category label), `dark:ring-forest-400/20` (category badge ring)
- `frontend/src/components/ThemeToggle.tsx` — remap `dark:text-forest-300` (icon colour)
- `frontend/src/components/AddWordModal.tsx` — remap `dark:text-forest-200` (form labels), `dark:text-forest-300` (cancel button)
- `frontend/src/components/SearchBar.tsx` — remap `dark:text-forest-500` (search icon, placeholder, clear button), `dark:group-focus-within:text-forest-400` (focus icon)

**Out of scope:**

- Light-mode token values — must not change
- `forest-*` token definitions in `@theme inline` — the scale itself (`forest-50` through `forest-900`) is correct and stays unchanged
- Backend code
- Component layout, spacing, or functional behaviour

---

## Architecture

```txt
globals.css  (@theme inline: --color-forest-* tokens)
     │
     ▼
.dark class on <html>  (set by layout.tsx inline script before hydration)
     │                  (toggled at runtime by ThemeToggle.tsx)
     │
     ├── page.tsx          dark:text-forest-300 → dark:text-forest-200
     │                     dark:text-forest-400 → dark:text-forest-300
     │
     ├── WordTable.tsx      dark:text-forest-300 → dark:text-forest-200  (word, translation)
     │                     dark:text-forest-500 → dark:text-forest-400  (gender, date)
     │                     dark:text-forest-200 → dark:text-forest-100  (category label)
     │                     dark:ring-forest-400/20 → dark:ring-forest-300/20
     │
     ├── ThemeToggle.tsx    dark:text-forest-300 → dark:text-forest-200
     │
     ├── AddWordModal.tsx   dark:text-forest-200 → dark:text-forest-100  (form labels)
     │                     dark:text-forest-300 → dark:text-forest-200  (cancel button)
     │
     └── SearchBar.tsx      dark:text-forest-500 → dark:text-forest-400  (icon, placeholder)
                           dark:group-focus-within:text-forest-400 → dark:group-focus-within:text-forest-300
                           dark:hover:text-forest-300 → dark:hover:text-forest-200  (clear btn)
```

### Why shift toward lower (lighter) token numbers in dark mode

In dark mode the page background is `forest-900` (#081c15 — near-black). The mid-range tokens `forest-300` through `forest-500` are saturated green (#95d5b2 – #52b788), which appear as vivid neon against this very dark background. Shifting accent and secondary text toward `forest-100`/`forest-200` (pale, nearly-white with a slight green tint) reduces saturation and produces a muted, sophisticated look while keeping the green identity. Background and structural tokens (`forest-700`–`forest-900`) are already appropriate and are not touched.

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                          |
| --------------------------------------------- | ------ | ---------------------------------------------------- |
| `frontend/src/app/globals.css`                | Reuse  | No change expected; verified during audit            |
| `frontend/src/app/page.tsx`                   | Edit   | Remap 2 dark-mode text token classes                 |
| `frontend/src/components/WordTable.tsx`       | Edit   | Remap 4 categories of dark-mode token classes        |
| `frontend/src/components/ThemeToggle.tsx`     | Edit   | Remap 1 dark-mode icon text class                    |
| `frontend/src/components/AddWordModal.tsx`    | Edit   | Remap 2 dark-mode text classes (labels, cancel)      |
| `frontend/src/components/SearchBar.tsx`       | Edit   | Remap 3 dark-mode text classes (icon, placeholder, clear) |

---

### Existing Work (already done)

The flash-of-wrong-theme (FOWT) fix listed in the planning doc as a deliverable of this task is **already implemented** in `frontend/src/app/layout.tsx`:

- An inline `<script dangerouslySetInnerHTML>` reads `localStorage.getItem('theme')` and falls back to `window.matchMedia('(prefers-color-scheme: dark)')`, then sets `document.documentElement.classList` before first paint.
- `<html suppressHydrationWarning>` is already set.

No changes to `layout.tsx` are needed.

### Gaps to Close

1. Audit each in-scope component for `dark:*` classes in the `forest-200` – `forest-500` range used as foreground text or icon colour.
2. Apply the token shift rules from the mapping table below.
3. Manually verify in both light and dark mode that no light-mode class was inadvertently changed.

---

### Token Mapping

The remapping rule is: shift mid-range accent foreground tokens one step lighter (one step closer to `forest-100`) to reduce saturation in dark mode. Structural tokens (backgrounds, dividers, borders) are unchanged.

| Current dark-mode class             | Replacement                           | Used in                                           |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------- |
| `dark:text-forest-500`              | `dark:text-forest-400`                | `WordTable` gender/date, `SearchBar` icon/placeholder/clear |
| `dark:text-forest-400`              | `dark:text-forest-300`                | `page.tsx` loading text, `SearchBar` focus icon   |
| `dark:text-forest-300`              | `dark:text-forest-200`                | `page.tsx` subtitle, `WordTable` word/translation, `ThemeToggle` icon, `AddWordModal` cancel, `SearchBar` clear hover |
| `dark:text-forest-200`              | `dark:text-forest-100`                | `WordTable` category label, `AddWordModal` form labels |
| `dark:ring-forest-400/20`           | `dark:ring-forest-300/20`             | `WordTable` category badge ring                   |
| `dark:group-focus-within:text-forest-400` | `dark:group-focus-within:text-forest-300` | `SearchBar` search icon on focus           |
| `dark:hover:text-forest-300`        | `dark:hover:text-forest-200`          | `SearchBar` clear button hover                    |
| *(missing)* `dark:focus:ring-forest-400` | add alongside `focus:ring-forest-500` | `AddWordModal` and `SearchBar` input focus ring |

Unchanged in dark mode (correct as-is):

| Class pattern                        | Reason                                              |
| ------------------------------------ | --------------------------------------------------- |
| `dark:bg-forest-700/800/900`         | Dark backgrounds — appropriate depth                |
| `dark:border-forest-600/700`         | Structural dividers — already muted                 |
| `dark:text-forest-100`               | Primary foreground text — correct, stays            |
| `dark:divide-forest-700`             | Table dividers — correct                            |

---

### Testing Strategy

No automated tests apply — all verification is visual and manual.

**Dark mode verification:**

1. Open the app in a browser and enable dark mode via the `ThemeToggle`.
2. Verify the page background is deep dark green (`forest-900`) with no neon-green text anywhere.
3. Check each component:
   - Header subtitle: should be pale/muted green (not vivid forest-300)
   - WordTable rows: word and translation text should be pale (not vivid)
   - Gender and date labels: visibly muted secondary text (not bright green)
   - Category badge: pale text on dark background with subtle ring
   - SearchBar: icon and placeholder in muted tone
   - AddWordModal (open via "Add New Word"): form labels and cancel button should be pale, not vivid green

**Light mode regression:**

4. Switch to light mode. Verify nothing looks different from the pre-change state — no light-mode class was touched.

**FOWT regression:**

5. Disable JavaScript in browser devtools, then re-enable and hard-reload. The page should render immediately in the correct theme (no flicker).

**Edge cases:**

- System dark mode preference (no `localStorage.theme` set) → page should default to dark mode on first load without flash
- Rapid toggle (light → dark → light) → no visual glitch or state desync in `ThemeToggle`

---

### Open Questions / Risks

- [x] **`focus:ring-forest-500` not dark-mode scoped:** **Decision: add `dark:focus:ring-forest-400`** to `AddWordModal.tsx` and `SearchBar.tsx`. Follows the same one-step-lighter remapping rule as every other mid-range token; `forest-400` (#74c69d) remains clearly visible for keyboard-focus accessibility. Leaving it unchanged would make the focus ring the one remaining neon-green element in dark mode.
- [ ] **`dark:text-forest-200` in AddWordModal form labels:** Shifting to `dark:text-forest-100` makes labels nearly white. **Deferred to visual review** — start with `dark:text-forest-100`, revert to `dark:text-forest-200` if the contrast looks excessive during the manual check.
