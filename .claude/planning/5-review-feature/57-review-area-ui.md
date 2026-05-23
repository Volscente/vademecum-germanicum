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
  collapsed ? "max-h-0" : "max-h-500",
)}
```

No JS height measurement. Fields remain mounted in both states (same reason as `EditWordModal`: no need to re-mount on toggle).

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

No new data models. `SenseWithWord` (already in `frontend/src/types/word.ts`) is the sole data contract:

```ts
// Existing — do not modify in this task
export interface SenseWithWord extends Sense {
  word: string;
  translation: string;
  gender?: string;
  category?: string;
}

// Sense (parent) — existing fields relevant to SenseCard:
export interface Sense {
  id?: number;
  meaning_summary: string;
  register: "Formal" | "Colloquial" | "Neutral" | "Technical";
  difficulty_level?: "Easy" | "Medium" | "Hard" | "VeryHard";
  last_reviewed_at?: string | null;
  grammar_patterns: GrammarPattern[];
  example_sentences: ExampleSentence[];
}
```

**Known gap (see Open Questions):** `SenseWithWord` does not include `word_plural`, `auxiliary_verb`, or `principal_forms`. The Word Information and Verb Morphology sections of `SenseCard` cannot display these fields with the current interface. Resolve before implementing `SenseCard` — either extend the backend `SenseWithWordRead` schema and update `SenseWithWord`, or explicitly accept that these fields are omitted in v1.

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
- Very long `meaning_summary` or many example sentences → `max-h-500` cap may clip content; verify `overflow-y-auto` on the section body if needed
- `category` value not equal to `"verb"` (noun, adjective, adverb, pronoun) → Verb Morphology section absent in all cases

---

### Open Questions / Risks

- [ ] **`SenseWithWord` missing verb morphology fields:** `word_plural`, `auxiliary_verb`, `principal_forms` are absent from the current `SenseWithWord` interface and `SenseWithWordRead` backend schema. The Verb Morphology section (auxiliary verb + principal forms) and Word Information plural field cannot be rendered without extending the schema. Decide before coding `SenseCard`: extend `SenseWithWordRead` (backend + frontend types) or explicitly omit these fields from the card. **Target:** before TASK-3 implementation starts
- [ ] **Difficulty button icons:** The four `lucide-react` icons to use for Easy / Medium / Hard / Very Hard are unspecified. Candidates: `ThumbsUp` / `Minus` / `TrendingDown` / `ThumbsDown` or styled text badges only. Decide at implementation time. **Target:** during TASK-3 implementation
- [ ] **Progress indicator:** Whether to display a "2 / 7 senses" counter in `ReviewArea` for TASK-3 (display only, no state) or defer to TASK-4 alongside the full navigation logic. **Target:** before TASK-3 implementation starts
- [ ] **`max-h-500` clipping:** The fixed `max-h-500` Tailwind class used in `EditWordModal` may clip `SenseCard` sections with many grammar patterns or example sentences. Evaluate during manual testing; add `overflow-y-auto` to the section body if content overflows. **Target:** during TASK-3 manual testing
