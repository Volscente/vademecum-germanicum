# #57: Review Area UI

**GitHub Issue:** [#57 — Review Area UI](https://github.com/Volscente/vademecum-germanicum/issues/57)
**GitHub Milestone:** [Milestone: 5-review-feature](https://github.com/Volscente/vademecum-germanicum/milestone/7)
**Notion page:** [5 - Review Feature](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11)

---

## Technical Scope

**In scope:**

- `frontend/src/components/ReviewArea.tsx` — Create: full-canvas container; owns no navigation logic (TASK-4); renders `SenseCard` for the first sense in the queue; forwards `onNavigate` callback down to children; acts as the mount point for `ReviewCompleteScreen` (TASK-4 placeholder)
- `frontend/src/components/SenseCard.tsx` — Create: three collapsible sections (Word Information, Verb Morphology, Sense Information) using the `max-h` CSS-only toggle established in `EditWordModal`; conditional Verb Morphology rendered only when `category === "verb"`; four Difficulty Level buttons (Easy, Medium, Hard, Very Hard) using `lucide-react` icons and the `forest-*` palette; fires `onDifficultySelect` callback (stubbed — wired to API in TASK-4)
- `frontend/src/app/page.tsx` — Modify: replace the `area === "review"` placeholder `<p>` with `<ReviewArea reviewQueue={reviewQueue} onNavigate={setArea} />`

**Out of scope:**

- `updateSenseReview` API call and index advancement (TASK-4)
- `isTransitioning` animation state and CSS opacity/translate-x transition (TASK-4)
- `ReviewCompleteScreen.tsx` (TASK-4)
- Any changes to backend schemas or TypeScript types in `word.ts` — see Open Questions

---

## Architecture

```txt
page.tsx  (area === "review")
     │  reviewQueue: SenseWithWord[]
     │  setArea: Dispatch<SetStateAction<"vocabulary" | "learning" | "review">>
     ▼
ReviewArea.tsx
  props: { reviewQueue, onNavigate }
     │  sense = reviewQueue[0]   ← currentIndex owned here (starts at 0; advancing is TASK-4)
     │
     ▼
SenseCard.tsx
  props: { sense: SenseWithWord, onDifficultySelect }
     │
     ├── [Word Information]        collapsible — always rendered
     │     word · translation · gender · category · word_plural*
     │
     ├── [Verb Morphology]         collapsible — only when category === "verb"
     │     auxiliary_verb* · principal_forms*
     │
     ├── [Sense Information]       collapsible — always rendered
     │     meaning_summary · register · grammar_patterns[] · example_sentences[]
     │
     └── [Difficulty Buttons]
           Easy | Medium | Hard | Very Hard    (lucide-react icons, forest-* palette)
           → onDifficultySelect("Easy" | "Medium" | "Hard" | "VeryHard")
                 ↑ stubbed in TASK-3; wired to updateSenseReview + index advance in TASK-4
```

### Collapsible section pattern

Sections use the exact CSS-only toggle already established in `EditWordModal.tsx` — a `useState(false)` boolean per section, toggled by a `<button>` header bearing `ChevronDown` / `ChevronUp` icons, with the body gated by:

```tsx
className={clsx(
  "overflow-hidden transition-[max-height] duration-300",
  collapsed ? "max-h-0" : "max-h-[500px]",
)}
```

The section body also receives `overflow-y-auto` so that content taller than 500 px is scrollable rather than silently clipped. No JS height measurement. Fields remain mounted in both states (same reason as `EditWordModal`: no need to re-mount on toggle).

### Conditional Verb Morphology

The Verb Morphology section is **not rendered at all** when `sense.category !== "verb"` — matching `AddWordModal` and `EditWordModal` where auxiliary verb / principal form inputs appear only for verb category words. This avoids empty collapsed headers for non-verb senses.

---

## Tech Stack

No new packages required. All dependencies (`lucide-react`, `clsx`, Tailwind CSS v4) are already installed.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
| ---- | ------ | ----------- |
| `backend/src/backend/schemas.py` | Modify | Add `word_plural`, `auxiliary_verb`, `principal_forms` to `SenseWithWordRead` |
| `backend/src/backend/main.py` | Modify | Pass the three new fields when constructing `SenseWithWordRead` in `read_senses` |
| `frontend/src/types/word.ts` | Modify | Add `word_plural`, `auxiliary_verb`, `principal_forms` to `SenseWithWord` |
| `frontend/src/components/ReviewArea.tsx` | Create | Container for the review session; renders `SenseCard` for the current sense; placeholder for `ReviewCompleteScreen` (TASK-4) |
| `frontend/src/components/SenseCard.tsx` | Create | Collapsible sense card with three sections, conditional Verb Morphology, and four Difficulty Level buttons |
| `frontend/src/app/page.tsx` | Modify | Replace `area === "review"` placeholder with `<ReviewArea reviewQueue={reviewQueue} onNavigate={setArea} />` |

---

### Key Functions

**`ReviewArea` component props interface:**

```tsx
interface ReviewAreaProps {
  reviewQueue: SenseWithWord[];
  onNavigate: (area: "vocabulary" | "learning") => void;
}
```

- Renders nothing meaningful when `reviewQueue` is empty (guard: show a "No senses selected" fallback).
- In TASK-3: `currentIndex` is fixed at `0` — renders `reviewQueue[0]`. TASK-4 adds the state and advancement logic.
- Passes a stubbed `onDifficultySelect` to `SenseCard` (e.g. `() => {}`); TASK-4 replaces the stub with the real handler.
- Displays a read-only progress counter: `"1 / {reviewQueue.length} senses"` (hardcoded to 1 in TASK-3; TASK-4 makes it dynamic via `currentIndex + 1`).

**`SenseCard` component props interface:**

```tsx
interface SenseCardProps {
  sense: SenseWithWord;
  onDifficultySelect: (level: "Easy" | "Medium" | "Hard" | "VeryHard") => void;
}
```

- Internal state: three `useState(false)` booleans — `wordInfoCollapsed`, `verbMorphologyCollapsed`, `senseInfoCollapsed`.
- All three sections start expanded (`false`).
- Verb Morphology section: conditional on `sense.category === "verb"`; omitted entirely (not collapsed) when the category is not verb.

**`page.tsx` change (in-place, surgical):**

Replace lines 156–162 (the `area === "review"` block):

```tsx
// Before (placeholder):
{area === "review" && (
  <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6">
    <p className="text-center py-10 text-forest-600 dark:text-forest-300 italic">
      Review Area coming soon ({reviewQueue.length} senses queued).
    </p>
  </div>
)}

// After:
{area === "review" && (
  <ReviewArea
    reviewQueue={reviewQueue}
    onNavigate={(target) => setArea(target)}
  />
)}
```

Note: `ReviewArea` owns its own card/layout wrapper — drop the outer `<div>` wrapper that exists in the vocabulary and learning blocks, so `ReviewArea` can control its own full-canvas layout.

---

### Data Models / Schemas

`SenseWithWord` (frontend) and `SenseWithWordRead` (backend) must be extended to carry the three verb/plural fields that the Word Information and Verb Morphology sections need.

**Backend — `backend/src/backend/schemas.py`:**

```python
# Before:
class SenseWithWordRead(SenseRead):
    word: str
    translation: str
    gender: Optional[GenderEnum] = None
    category: Optional[CategoryEnum] = None

# After:
class SenseWithWordRead(SenseRead):
    word: str
    translation: str
    gender: Optional[GenderEnum] = None
    category: Optional[CategoryEnum] = None
    word_plural: Optional[str] = None
    auxiliary_verb: Optional[str] = None
    principal_forms: Optional[list[str]] = None
```

**Backend — `backend/src/backend/main.py` (`read_senses` constructor):**

Add three new kwargs to the existing `SenseWithWordRead(...)` call:

```python
word_plural=sense.word.word_plural,
auxiliary_verb=sense.word.auxiliary_verb,
principal_forms=sense.word.principal_forms,
```

**Frontend — `frontend/src/types/word.ts`:**

```ts
// Before:
export interface SenseWithWord extends Sense {
  word: string;
  translation: string;
  gender?: string;
  category?: string;
}

// After:
export interface SenseWithWord extends Sense {
  word: string;
  translation: string;
  gender?: string;
  category?: string;
  word_plural?: string | null;
  auxiliary_verb?: string | null;
  principal_forms?: string[] | null;
}
```

No migration or DB schema change is required — these columns already exist on the `Word` model; `SenseWithWordRead` simply wasn't forwarding them.

---

### Testing Strategy

**Manual integration test:**

1. Start the full stack (`just dev`).
2. In the Learning Area, select one verb sense and one non-verb sense; click "Start Review".
3. Verify `ReviewArea` renders and shows `SenseCard` for the first selected sense.
4. For a verb sense: verify all three sections are present and expanded; toggle each section header and confirm collapse/expand animation; confirm Difficulty Level buttons render.
5. For a non-verb sense: verify Verb Morphology section is completely absent.
6. Confirm difficulty buttons fire `onDifficultySelect` (log to console in TASK-3 stub).
7. Verify dark mode renders correctly for all card elements.

**Edge cases:**

- `reviewQueue` with a single sense → card renders; no crash on mount
- Sense with empty `grammar_patterns` or `example_sentences` arrays → Sense Information section shows gracefully (empty lists, no JS error)
- Very long `meaning_summary` or many example sentences → section body has `overflow-y-auto`; verify content is scrollable and not clipped
- `category` value not equal to `"verb"` (noun, adjective, adverb, pronoun) → Verb Morphology section absent in all cases

---

### Open Questions / Risks

- [x] **`SenseWithWord` missing verb morphology fields:** Resolved — extend `SenseWithWordRead` (backend) and `SenseWithWord` (frontend) with `word_plural`, `auxiliary_verb`, `principal_forms`. See Data Models / Schemas for exact diffs. No DB migration needed.
- [x] **Difficulty button icons:** Resolved — `ThumbsUp` (Easy) / `Minus` (Medium) / `TrendingDown` (Hard) / `ThumbsDown` (Very Hard) from `lucide-react`.
- [x] **Progress indicator:** Resolved — display `"1 / N senses"` in `ReviewArea` as a read-only counter hardcoded to 1 in TASK-3; TASK-4 makes it dynamic.
- [x] **`max-h-500` clipping:** Resolved — section bodies receive `overflow-y-auto` so tall content is scrollable rather than clipped.
