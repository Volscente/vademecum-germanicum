# #56: Learning Area UI — Senses Table and Review Cart

**GitHub Issue:** [#56 — Learning Area](https://github.com/Volscente/vademecum-germanicum/issues/56)
**GitHub Milestone:** [Milestone: 5-review-feature](https://github.com/Volscente/vademecum-germanicum/milestone/7)
**Notion page:** [5 - Review Feature](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11)

---

## Technical Scope

**In scope:**

- `frontend/src/app/page.tsx` — Add `area` and `reviewQueue` state; wire `AreaToggle` above the content pane (hidden when `area === "review"`); conditionally render `WordTable` vs `SensesTable` vs `ReviewArea` placeholder based on `area`
- `frontend/src/components/AreaToggle.tsx` — New component: pill-style toggle switch between `"vocabulary"` and `"learning"` areas, styled with the existing `forest-*` Tailwind palette
- `frontend/src/components/SensesTable.tsx` — New component: fetches all senses via `getSenses()` on mount, renders a table with columns (Word, Translation, Category, Difficulty Level, Last Reviewed, To Review badge), checkbox per row for multi-select, and a "Start Review" button visible when at least one row is selected

**Out of scope:**

- `ReviewArea` and `SenseCard` components — built in TASK-3; a minimal `<div>` placeholder suffices here
- Difficulty button API calls and card transition animation — wired in TASK-4
- Any backend changes — fully completed in TASK-1 (`GET /senses/`, `PUT /senses/{sense_id}/review`, `getSenses()`, `updateSenseReview()`, `toReview()`, `SenseWithWord` type)
- Search or filter within the Senses Table

---

## Architecture

```txt
page.tsx
    │  area: "vocabulary" | "learning" | "review"
    │  reviewQueue: SenseWithWord[]
    │
    ├── <AreaToggle area onAreaChange />   (rendered above content pane; hidden when area === "review")
    │
    ├─[area === "vocabulary"]──► <WordTable words onRefresh />
    │
    ├─[area === "learning"]────► <SensesTable
    │                                onStartReview={(selected) => {
    │                                  setReviewQueue(selected)
    │                                  setArea("review")
    │                                }}
    │                            />
    │                              │
    │                              ├── getSenses() ──► GET /senses/ ──► SenseWithWord[]
    │                              ├── toReview(sense) ──► boolean  (per-row badge)
    │                              └── selectedSenseIds: Set<number>  (local state)
    │
    └─[area === "review"]──────► <div>Review Area placeholder</div>  (TASK-3)
```

### Why area state lives in page.tsx

`reviewQueue` must outlive `SensesTable` — it is consumed by `ReviewArea`, which is a sibling rendered at the same level. Lifting both `area` and `reviewQueue` to `page.tsx` is consistent with the established pattern where all cross-component state (`words`, `searchTerm`, modal open/close) already lives in the root page. `selectedSenseIds` is kept local to `SensesTable` because nothing outside that component needs it.

---

## Tech Stack

No new packages required. All dependencies (`lucide-react`, `tailwindcss`, `clsx`) are already installed.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
| ---- | ------ | ----------- |
| `frontend/src/app/page.tsx` | Modify | Add `area` and `reviewQueue` state; render `AreaToggle` (hidden in review mode); conditional content rendering |
| `frontend/src/components/AreaToggle.tsx` | Create | Pill toggle between `"vocabulary"` and `"learning"` |
| `frontend/src/components/SensesTable.tsx` | Create | Senses table with multi-select checkboxes, To Review badge, and Start Review button |

---

### Key Functions

```typescript
// page.tsx — handler passed to SensesTable
function handleStartReview(selected: SenseWithWord[]): void
// Sets reviewQueue = selected, then area = "review".
// selected preserves the row order from SensesTable.
```

```typescript
// AreaToggle.tsx
type Area = "vocabulary" | "learning";

interface AreaToggleProps {
  area: Area;
  onAreaChange: (area: Area) => void;
}
// Pill-style toggle; clicking the inactive pill calls onAreaChange with the new value.
// Does not render when area === "review" (ReviewArea has its own exit controls).
```

```typescript
// SensesTable.tsx
interface SensesTableProps {
  onStartReview: (selected: SenseWithWord[]) => void;
}
// Calls getSenses() on mount. Maintains selectedSenseIds: Set<number> as local state.
// Renders one table row per SenseWithWord; each row has a checkbox bound to local selection.
// difficulty_level is displayed as-is; null is treated as "Medium" for display purposes.
// "Start Review" button is rendered (and enabled) only when selectedSenseIds.size > 0.
// On "Start Review" click: resolves the ordered SenseWithWord[] from the current senses
// array preserving row order, then calls onStartReview(selected).
```

---

### Data Models / Schemas

All types are already defined in `frontend/src/types/word.ts` (TASK-1 deliverable). No new types are required.

```typescript
// Relevant existing interfaces (for reference):

interface SenseWithWord {
  id: number;
  word: string;
  translation: string;
  gender: string;
  category: string;
  meaning_summary: string;
  register: string;
  grammar_patterns: GrammarPattern[];
  example_sentences: ExampleSentence[];
  difficulty_level: string | null;   // DifficultyLevelEnum value or null
  last_reviewed_at: string | null;   // ISO timestamp or null
}
```

`toReview(sense: SenseWithWord): boolean` is already implemented in `frontend/src/lib/reviewUtils.ts`.

---

### Testing Strategy

**Manual integration test (golden path):**

```bash
just dev
# Open http://localhost:3000
```

1. Verify the `AreaToggle` renders above the word table.
2. Click "Learning" — `SensesTable` replaces `WordTable`; rows load from `GET /senses/`.
3. Verify all six columns render (Word, Translation, Category, Difficulty Level, Last Reviewed, To Review badge).
4. Verify senses with `last_reviewed_at = null` always show the To Review badge.
5. Click one checkbox — "Start Review" button appears.
6. Click "Start Review" — content pane transitions to the `ReviewArea` placeholder; `area === "review"`.
7. Toggle back to "Vocabulary" via `AreaToggle` (if rendered) or via the placeholder — `WordTable` restores; existing `words` state is unchanged.

**Edge cases:**

- No senses in the database → `SensesTable` renders an empty table body with no "Start Review" button
- All rows selected → "Start Review" fires with the full ordered senses array
- `difficulty_level = null` → rendered as `"Medium"`
- Toggling from Learning back to Vocabulary while rows are selected → `selectedSenseIds` persists in `page.tsx`; re-entering Learning re-shows the prior selection

---

### Open Questions / Risks

All open questions resolved:

- **`selectedSenseIds` placement:** kept local to `SensesTable` — nothing outside the component needs it.
- **`AreaToggle` in Review Area:** not rendered when `area === "review"`.
- **`difficulty_level = null` display:** shown as `"Medium"`.
