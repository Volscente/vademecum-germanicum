# #48: Collapsible Sense Cards

**GitHub Issue:** [#48 — Collapsible Sense Cards](https://github.com/Volscente/vademecum-germanicum/issues/48)
**GitHub Milestone:** [4-collapsable-cards](https://github.com/Volscente/vademecum-germanicum/milestone/4-collapsable-cards)
**Notion page:** [4-Collapsable Cards](https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375)

---

## Technical Scope

**In scope:**

- `frontend/src/components/EditWordModal.tsx` — add `sensesCollapsed: boolean[]` local state; `useEffect` to sync array length with `fields.length` from `useFieldArray`; per-sense toggle handler; collapsed card header (ChevronDown/ChevronUp icon, Meaning Summary text, error badge); CSS max-height collapse on each Sense card body

**Out of scope:**

- `frontend/src/lib/wordSchema.ts` — no schema changes required
- `frontend/src/lib/api.ts` — no API changes required
- `frontend/src/types/word.ts` — no type changes required
- `frontend/src/components/AddWordModal.tsx` — not touched
- Global "Collapse All" button (TASK-3 / Issue #49)

---

## Architecture

```txt
EditWordModal.tsx
│
├── verbMorphologyCollapsed: boolean          ← already in place (TASK-1 / v0.3.3)
├── sensesCollapsed: boolean[]               ← NEW
│   └── useEffect([fields.length])           ← grow/truncate on append / remove / Re-enrich reset
│
├── fields (useFieldArray on "senses")
│   └── fields[n] — one entry per Sense
│
└── JSX: fields.map((field, n) => ...)
       │
       ├── Card Header (always rendered)
       │   ├── ChevronDown / ChevronUp icon  ← onClick: toggleSenseCollapsed(n)
       │   ├── "Sense {n+1}" title
       │   ├── watch(`senses.${n}.meaning_summary`) or "No summary yet"  ← shown when collapsed
       │   └── red dot badge if !!errors.senses?.[n] && sensesCollapsed[n]
       │
       └── Card Body
           └── clsx(overflow-hidden transition-[max-height] duration-300,
                    sensesCollapsed[n] ? max-h-0 : max-h-[2000px])
               └── [all existing sense fields — remain mounted, always registered with RHF]
```

### Why CSS-only collapse (not unmount)

React-hook-form registers fields at mount time. Unmounting a collapsed Sense card drops its fields from the form payload and skips validation — violating the constraint that hidden fields must still fail validation. `max-h-0 overflow-hidden` hides the card visually while keeping all fields mounted and registered.

---

## Tech Stack

No new packages required. All tools (`useState`, `useEffect`, `useWatch`, `useFieldArray`, `formState.errors`, `clsx`, `ChevronDown`/`ChevronUp` from `lucide-react`, Tailwind `transition-[max-height]`) are already in the stack and used in `EditWordModal.tsx` by TASK-1.

---

## Implementation Details

### Modules / Files

| File                                        | Action | Description                                                                        |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `frontend/src/components/EditWordModal.tsx` | Modify | Add `sensesCollapsed` state, `useEffect` sync, per-sense toggle, collapsed headers |

---

### Key Functions

```typescript
// State initialisation — parallel boolean array, one entry per sense
const [sensesCollapsed, setSensesCollapsed] = useState<boolean[]>([]);
```

```typescript
// Sync sensesCollapsed length with the useFieldArray fields array.
// Appends false for new entries; truncates on remove.
// Re-enrich calls reset(), which repopulates fields from zero — useEffect fires,
// resetting the array to all-false so the user sees every newly populated Sense expanded.
useEffect(() => {
  setSensesCollapsed(prev => {
    if (fields.length > prev.length) {
      return [...prev, ...Array(fields.length - prev.length).fill(false)];
    }
    return prev.slice(0, fields.length);
  });
}, [fields.length]);
```

```typescript
// Toggle a single Sense card at index n, leaving all other entries unchanged.
const toggleSenseCollapsed = (index: number): void => {
  setSensesCollapsed(prev =>
    prev.map((collapsed, i) => (i === index ? !collapsed : collapsed))
  );
};
```

```tsx
// Collapsed card header JSX pattern — inside fields.map((field, n) => ...)
const meaningPreview = watch(`senses.${n}.meaning_summary`) || 'No summary yet';
const hasSenseError = !!formState.errors.senses?.[n];

// Header row (always visible)
<div
  className="flex items-center cursor-pointer select-none gap-2 py-2"
  onClick={() => toggleSenseCollapsed(n)}
>
  {sensesCollapsed[n] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
  <span className="font-medium">Sense {n + 1}</span>
  {sensesCollapsed[n] && (
    <span className="text-sm text-gray-500 truncate">{meaningPreview}</span>
  )}
  {hasSenseError && sensesCollapsed[n] && (
    <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
  )}
</div>

// Card body with CSS-only collapse
<div
  className={clsx(
    'overflow-hidden transition-[max-height] duration-300',
    sensesCollapsed[n] ? 'max-h-0' : 'max-h-[2000px]'
  )}
>
  {/* all existing sense fields unchanged */}
</div>
```

---

### Data Models / Schemas

No new data models or schemas introduced. The implementation relies entirely on existing types:

| Symbol                                    | Source                                    | Role                                              |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| `boolean[]`                               | built-in                                  | Per-sense collapse state, indexed parallel to `fields` |
| `fields` (`useFieldArray`)                | react-hook-form                           | Source of truth for sense count and stable IDs    |
| `formState.errors.senses?.[n]`            | react-hook-form / `wordSchema.senseSchema` | Drives error badge visibility per card            |
| `` watch(`senses.${n}.meaning_summary`) `` | react-hook-form `useWatch`                | Real-time summary text in collapsed header        |

---

### Testing Strategy

No automated frontend tests exist in this project. Verify manually:

**Happy path:**

1. Open `EditWordModal` for a word with ≥ 2 Senses.
2. Click the Sense 1 header — confirm: body collapses, Meaning Summary appears in the header row, Sense 2 card unchanged.
3. Click again — confirm: body expands, summary text hidden from header.

**State sync:**

1. Click "Add Sense" — confirm: new Sense card appears expanded (`sensesCollapsed[n] === false`).
2. Remove Sense 2 while Sense 3 is collapsed — confirm: Sense 3 re-indexes to Sense 2, collapse state follows correctly.
3. Click Re-enrich — confirm: all Sense cards expand (array fully reset to `false`).

**Validation:**

1. Collapse a Sense with a required field empty, then click Save — confirm: red error badge appears on the collapsed header; form submission is blocked.
2. Expand the errored Sense and fix the field — confirm: badge disappears without re-collapsing.

**Edge cases:**

- Sense with no Meaning Summary yet → collapsed header shows "No summary yet"
- Single-Sense word → one card; collapse/expand works in isolation
- Very long Meaning Summary → summary text truncates (`truncate` utility class)

---

### Open Questions / Risks

- [x] **Array out-of-sync on rapid append/remove:** `useEffect` on `fields.length` resets the array on every length change. Verify during manual testing that rapid consecutive Remove clicks do not leave stale entries. **Target:** during implementation session. **Answer:** Validation during user test.
- [x] **CSS max-height clipping on tall Sense cards:** `max-h-[2000px]` may clip a Sense card with many grammar patterns and example sentences. **Target:** review after implementation; increase bound or switch to `max-h-screen` if clipping is observed. **Answer:** Sense Cards will not be this big.
- [x] **Error badge after Re-enrich reset:** `reset()` clears `formState.errors`; badges should disappear. Verify no stale error state remains after Re-enrich. **Target:** during manual testing step 6. **Answer:** Validation during user test.
