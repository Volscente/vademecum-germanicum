# #47: Collapsible Verb Morphology Card

**GitHub Issue:** [#47 — Collapsible Verb Morphology Card](https://github.com/Volscente/vademecum-germanicum/issues/47)
**GitHub Milestone:** [Milestone: 4-collapsable-cards](https://github.com/Volscente/vademecum-germanicum/milestone/4-collapsable-cards)
**Notion page:** [4-Collapsable Cards](https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375)

---

## Technical Scope

**In scope:**

- `frontend/src/components/EditWordModal.tsx` — Add `verbMorphologyCollapsed` boolean state, a clickable card header with `ChevronDown`/`ChevronUp` icon, CSS max-height collapse on the card body (fields stay mounted), conditional render guard hiding the whole card when `category !== 'verb'`, real-time principal-forms summary via `useWatch`, and an error badge keyed to `formState.errors.principal_forms` / `formState.errors.auxiliary_verb`

**Out of scope:**

- `frontend/src/lib/wordSchema.ts` — no schema changes
- `frontend/src/lib/api.ts` — no API changes
- `frontend/src/types/word.ts` — no type changes
- Collapsible Sense cards (TASK-2)
- Global "Collapse All" button (TASK-3)

---

## Architecture

```txt
EditWordModal.tsx (single integration point)
    │
    ├─ Local state: verbMorphologyCollapsed: boolean  (default: false)
    │
    ├─ watch('category') === 'verb'?
    │       │  NO  ──► card not rendered at all
    │       │
    │       │  YES
    │       ▼
    │   [Card Header — clickable row]
    │       ├─ ChevronUp / ChevronDown  (lucide-react, already imported)
    │       ├─ "Verb Morphology" title
    │       ├─ Summary text  ◄── useWatch(['principal_forms'])
    │       │                    "Infinitiv · Präteritum · Partizip II"
    │       │                    fallback "—" when any value is empty
    │       └─ Error badge (red dot)
    │                ▲── rendered when:
    │                    !!formState.errors.principal_forms ||
    │                    !!formState.errors.auxiliary_verb
    │
    └─ [Card Body]
            └─ clsx toggle on verbMorphologyCollapsed
                    true  → 'max-h-0 overflow-hidden'   (hidden, fields MOUNTED)
                    false → 'max-h-[2000px]'             (visible)
               + 'transition-[max-height] duration-300'  (smooth animation)
               Fields remain registered with RHF in both states.
```

### Why CSS-only collapse instead of conditional unmount

Collapsing via `max-h-0 overflow-hidden` keeps the fields mounted and registered with react-hook-form. Unmounting would drop their registration, excluding them from validation and the submitted payload — violating the stated constraint that hidden fields must still trigger validation errors.

---

## Tech Stack

No new packages required.

| Package | Already in stack | Role in this task |
| --- | --- | --- |
| `react-hook-form` | Yes | `useWatch` for real-time summary; `formState.errors` for error badge |
| `lucide-react` | Yes | `ChevronDown`, `ChevronUp` icons for toggle affordance |
| `tailwindcss` v4 | Yes | `max-h-0`, `max-h-[2000px]`, `overflow-hidden`, `transition-[max-height]` |
| `clsx` / `tailwind-merge` | Yes | Conditional class merging on the card body |

---

## Implementation Details

### Modules / Files

| File | Action | Description |
| --- | --- | --- |
| `frontend/src/components/EditWordModal.tsx` | Modify | All changes for this task live here; no other files change |

---

### Key Logic Blocks

**1 — State declaration** (add alongside existing `useState` calls in `EditWordModal`):

```tsx
const [verbMorphologyCollapsed, setVerbMorphologyCollapsed] = useState(false);
```

**2 — Principal-forms summary** (add alongside existing `watch` / `useWatch` calls):

```tsx
const watchedPrincipalForms = useWatch({ control, name: 'principal_forms' });
// principal_forms is z.array(z.string()) — a flat string[]
// [0] = Infinitiv, [1] = Präteritum, [2] = Partizip II (order fixed by the 3-input grid in the form)

const verbMorphologySummary =
  watchedPrincipalForms?.[0] && watchedPrincipalForms?.[1] && watchedPrincipalForms?.[2]
    ? `${watchedPrincipalForms[0]} · ${watchedPrincipalForms[1]} · ${watchedPrincipalForms[2]}`
    : '—';
```

**3 — Error badge condition:**

```tsx
const verbMorphologyHasError =
  !!formState.errors.principal_forms || !!formState.errors.auxiliary_verb;
```

**4 — Conditional render guard + card header + card body** (wraps the existing Verb Morphology JSX block):

```tsx
{(watchedCategory === 'verb' || word.auxiliary_verb) && (
  <div className="border border-forest-200 dark:border-forest-600 rounded-lg p-3 space-y-3">
    {/* Card Header */}
    <button
      type="button"
      onClick={() => setVerbMorphologyCollapsed((prev) => !prev)}
      className="flex w-full items-center gap-2"
    >
      {verbMorphologyCollapsed
        ? <ChevronDown className="w-3 h-3 text-forest-600 dark:text-forest-300" />
        : <ChevronUp className="w-3 h-3 text-forest-600 dark:text-forest-300" />
      }
      <span className="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide">
        Verb Morphology
      </span>
      {verbMorphologyCollapsed && (
        <span className="ml-2 text-xs text-forest-500 dark:text-forest-400">{verbMorphologySummary}</span>
      )}
      {verbMorphologyHasError && (
        <span className="ml-auto h-2 w-2 rounded-full bg-red-500" aria-label="Contains errors" />
      )}
    </button>

    {/* Card Body — fields stay mounted, only visual height changes */}
    <div
      className={clsx(
        'overflow-hidden transition-[max-height] duration-300',
        verbMorphologyCollapsed ? 'max-h-0' : 'max-h-500',
      )}
    >
      {/* existing auxiliary_verb and principal_forms fields unchanged */}
    </div>
  </div>
)}
```

> **Note on render condition:** The current code uses `(watchedCategory === "verb" || word.auxiliary_verb)` — this is preserved as-is. The RFC-stated guard `category === 'verb'` is satisfied by the first branch; the `|| word.auxiliary_verb` fallback keeps existing verb words visible even if the user switches category mid-edit.

---

### Data Models / Schemas

No new models. The existing types that this task reads:

```ts
// From frontend/src/lib/wordSchema.ts (verified)
principal_forms: z.array(z.string()).optional()
// → WordFormValues['principal_forms']: string[] | undefined
// Index mapping (fixed by the 3-column grid in the form):
//   [0] = Infinitiv   [1] = Präteritum   [2] = Partizip II

// From frontend/src/types/word.ts
principal_forms?: string[]   // same flat array shape on the Word interface
auxiliary_verb?: string
category: string             // 'verb' | 'noun' | 'adjective' | 'adverb' | 'pronoun'
```

---

### Testing Strategy

**Manual / visual (golden path):**

1. Open `EditWordModal` for a **verb** word → Verb Morphology card is visible and expanded by default.
2. Click the card header → card collapses; summary line shows the three principal forms (or `"—"` if empty).
3. Click again → card expands; fields are intact and their values unchanged.
4. With the card collapsed, edit a principal-forms field in another tab / via devtools → summary text updates in real-time when expanded again.

**Manual / visual (edge cases):**

| Scenario | Expected behaviour |
| --- | --- |
| Word `category !== 'verb'` (noun, adjective, etc.) | Verb Morphology card is not rendered at all |
| Card collapsed, `principal_forms` fields empty | Collapsed header shows `"—"` placeholder |
| Card collapsed, `principal_forms` partially filled | Collapsed header shows `"—"` (all three must be present) |
| Form submitted with a required verb field empty while card is collapsed | RHF validation fires; red error badge appears on collapsed header |
| Word `category` changes from `verb` to `noun` mid-edit | Card disappears; state `verbMorphologyCollapsed` resets irrelevant (card not rendered) |

**No automated tests required for this task** — all behavior is ephemeral UI state in a single component. RHF validation correctness is already covered by existing schema tests in `wordSchema.ts`.

---

### Open Questions / Risks

- [x] **Exact `principal_forms` field path in `wordSchema`:** Confirmed — `principal_forms` is `z.array(z.string())`, a flat `string[]`. Index order `[0, 1, 2]` maps to Infinitiv, Präteritum, Partizip II (fixed by the existing 3-column input grid). `useWatch` call uses array indexing, not object property access. **Resolved.**
- [x] **CSS `max-h-[2000px]` clipping:** The card contains only two fields (`auxiliary_verb` + `principal_forms` 3-column grid) — clipping is not a concern. Using canonical Tailwind v4 class `max-h-500` (equivalent to 2000px via `--spacing × 500`). **Resolved — card implemented as designed.**
- [x] **Card header styling consistency:** Confirmed from existing `EditWordModal.tsx` code. Card wrapper: `border border-forest-200 dark:border-forest-600 rounded-lg p-3 space-y-3`. Header label: `text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide`. Icon size: `w-3 h-3`. Summary text: `text-xs text-forest-500 dark:text-forest-400`. No new design tokens introduced. **Resolved.**
