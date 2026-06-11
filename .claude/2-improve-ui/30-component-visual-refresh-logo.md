# #30: Component Visual Refresh & Logo

**GitHub Issue:** [#30 — Component Visual Refresh & Logo](https://github.com/Volscente/vademecum-germanicum/issues/30)
**GitHub Milestone:** [Milestone: Improve UI](https://github.com/Volscente/vademecum-germanicum/milestone/4)
**Notion page:** [2 — Improve UI](https://www.notion.so/2-Improve-UI-3575cc6c0f078023834df02a2390b410)

---

## Technical Scope

**In scope:**

- `frontend/src/app/page.tsx` — Add logo to the header; tighten header layout
- `frontend/src/components/WordTable.tsx` — Standardise row padding, header styling, and border colours
- `frontend/src/components/AddWordModal.tsx` — Standardise container border radius, field spacing, button hierarchy; audit focus-ring on textarea
- `frontend/src/components/EditWordModal.tsx` — Standardise container border radius, field spacing, button styles
- `frontend/src/components/SearchBar.tsx` — Verify border and focus-ring consistency against TASK-1 tokens

**Out of scope:**

- Backend (`/backend`) — no changes
- `frontend/src/app/globals.css` — palette tokens stabilised in TASK-1; consumed here, not modified
- `frontend/src/app/layout.tsx` — FOWT fix already shipped in TASK-1
- New npm dependencies — `lucide-react` covers the logo requirement without additions
- New image assets or `/public` entries
- Feature behaviour changes (add word, enrich, search, delete, toggle theme)

---

## Architecture

This is a leaf-level visual pass. All five files are independent components that share the same `forest-*` token vocabulary. No data flow or prop interface changes.

```txt
page.tsx (header + layout)
  ├── [logo + h1]    ← NEW: BookOpen icon alongside app name
  ├── ThemeToggle    (unchanged)
  ├── AddWordModal   ← rounded-md inputs, shadow-sm modal, button hierarchy audit
  ├── SearchBar      ← border + focus-ring verification
  └── WordTable      ← row padding, header weight, divide-* border colours
        └── EditWordModal  ← rounded-md inputs, shadow-sm modal, label/value spacing
```

### Why no shared Modal wrapper

All style changes are co-located in each component's JSX using Tailwind utility classes. Introducing a shared `Modal` or `Button` wrapper would expand scope beyond TASK-2 and risk breaking the validated `react-hook-form`/Zod integration in `AddWordModal`.

---

## Tech Stack

No new packages required.

| Package        | Note                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| `lucide-react` | Already installed; `BookOpen` is already imported in `WordTable.tsx` — reuse it   |

---

## Implementation Details

### Modules / Files

| File                                         | Action | Description                                                                                   |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `frontend/src/app/page.tsx`                  | Modify | Wrap `<h1>` in a flex row with a `BookOpen` icon; keep all existing state and fetch logic     |
| `frontend/src/components/WordTable.tsx`      | Modify | Uniform `py-3` row padding, consistent `font-semibold` headers, verified `divide-*` colours  |
| `frontend/src/components/AddWordModal.tsx`   | Modify | `rounded-md` on all inputs/selects/textarea; `shadow-sm` on modal; audit `example_sentences` focus-ring |
| `frontend/src/components/EditWordModal.tsx`  | Modify | Mirror `AddWordModal` container style; `space-y-3` field rows; consistent button pair         |
| `frontend/src/components/SearchBar.tsx`      | Modify | Verify `border-forest-200 dark:border-forest-700` and focus-ring tokens match TASK-1 palette  |

---

### Key Component Changes

#### `page.tsx` — Logo

Wrap the existing `<h1>` in a flex row that places a `BookOpen` icon to its left. No new import needed — `lucide-react` is already a project dependency.

```tsx
import { BookOpen } from "lucide-react";

// Replace the standalone <h1> block in the header <div>:
<div className="flex items-center gap-3">
  <BookOpen className="w-8 h-8 text-forest-600 dark:text-forest-300" />
  <h1 className="text-4xl font-bold text-forest-900 dark:text-forest-50">
    Vademecum Germanicum
  </h1>
</div>
<p className="text-forest-700 dark:text-forest-200 mt-2 ml-11">
  Your personal German vocabulary vault.
</p>
```

The `ml-11` on the subtitle aligns it under the text, not the icon — adjust to taste during implementation.

#### `WordTable.tsx` — Row & Border Pass

Current state: `<tbody>` uses `divide-forest-100 dark:divide-forest-700`, which is correct. Row cells are inconsistent (`py-4 pl-4 pr-3` on the first column vs `px-3 py-4` on others). Standardise:

- All `<td>`: `py-3 px-3` (first column: `py-3 pl-4 pr-3`)
- `<th>`: already `font-semibold text-sm` — keep; verify `dark:text-forest-100` is consistent
- `<tbody>` background: `bg-white dark:bg-forest-900` — keep

No ring or shadow changes needed on the table wrapper.

#### `AddWordModal.tsx` — Container & Input Standardisation

- Modal container: change `shadow-xl` → `shadow-sm`; keep `rounded-xl` (already visually appropriate for a floating modal)
- All `<input>` and `<select>`: change bare `rounded` → `rounded-md`
- `example_sentences` `<textarea>`: add `dark:focus:ring-forest-400` (currently missing per the TASK-1 changelog)
- Button hierarchy (already correct — no changes):
  - Primary: `bg-forest-600 hover:bg-forest-700 text-white` ("Save Word")
  - Secondary: `bg-forest-100 dark:bg-forest-700` ("Enrich")
  - Text: `text-forest-600 dark:text-forest-200` ("Cancel")

#### `EditWordModal.tsx` — Container & Field Spacing

- Modal container: change `shadow-xl` → `shadow-sm`; keep `rounded-xl`
- Field rows: change `space-y-2` → `space-y-3` for slightly more breathing room
- Button pair: "Delete Word" (`text-red-600`) left, "Close" (`bg-forest-100 dark:bg-forest-700`) right — keep; no class changes needed

#### `SearchBar.tsx` — Token Verification

Current classes are already well-formed (`border-forest-200 dark:border-forest-700`, `rounded-lg`, `focus:ring-forest-500 dark:focus:ring-forest-400`). This file likely needs **no changes** after TASK-1 — verify visually and skip if already correct.

---

### Testing Strategy

**Manual verification (golden paths):**

1. **Logo visible:** Open app in light mode and dark mode — `BookOpen` icon appears beside the title with correct colour tokens in both modes.
2. **Add word:** Open `AddWordModal`, fill all fields, click Enrich, submit — form submits, table refreshes, modal closes.
3. **Search:** Type in `SearchBar` — debounce fires after 300 ms, table updates.
4. **Word detail:** Click a table row — `EditWordModal` opens with correct word data.
5. **Delete:** Confirm deletion, verify table refreshes and modal closes.
6. **Theme toggle:** Switch between light and dark — all five components display the muted dark-mode palette with no neon greens.
7. **Lint:** `cd frontend && npm run lint` — must pass clean with no new errors.

**Edge cases:**

- `example_sentences` textarea focus ring in dark mode → must show `forest-400` ring, not missing ring
- Logo icon colour in dark mode → must use `dark:text-forest-300` (not `dark:text-forest-50` which would be too light)
- Modal backdrop (`bg-black/50`) → must remain visible without obscuring content in both modes

---

### Open Questions / Risks

- [ ] **Subjective acceptance criterion:** "Clean and lean" is qualitative. Agree on a reference screenshot before implementation begins; use it as the PR acceptance check rather than prose. **Target:** before first commit on this issue.
- [ ] **Logo icon choice:** `BookOpen` is the default candidate (already used in `WordTable.tsx`). If a different icon is preferred (`GraduationCap`, `Globe`, etc.), decide before implementing to avoid a revisit. **Target:** before first commit on this issue.
- [ ] **`rounded-xl` vs `rounded-md` on modal containers:** The RFC calls for `rounded-md` uniformly, but floating modals look better with `rounded-xl`. Decide on the standard for modal containers specifically. **Target:** resolved during implementation.
