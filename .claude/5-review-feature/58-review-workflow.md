# #58: Review Workflow — Transitions, API Updates, and Completion Screen

**GitHub Issue:** [#58 — Review Workflow](https://github.com/Volscente/vademecum-germanicum/issues/58)
**GitHub Milestone:** [Milestone: 5-review-feature](https://github.com/Volscente/vademecum-germanicum/milestone/7)
**Notion page:** [5 - Review Feature](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11)

---

## Technical Scope

**In scope:**

- `frontend/src/components/ReviewArea.tsx` — Add `currentIndex` and `isTransitioning` state; destructure `onNavigate` (declared in interface but currently not in the function signature); wire `onDifficultySelect` to `updateSenseReview` + index advancement; apply opacity + `translate-x` CSS transition on the `SenseCard` wrapper; render `ReviewCompleteScreen` when the queue is exhausted; update progress counter to reflect `currentIndex + 1`
- `frontend/src/components/ReviewCompleteScreen.tsx` — New completion screen with "Return to Vocabulary Area" and "Return to Learning Area" navigation buttons

**Out of scope:**

- Cart persistence across browser refresh — accepted v1 limitation; no `localStorage` integration
- Error handling or retry logic for `updateSenseReview` failures — fire-and-forget is intentional
- Any backend changes — all API work was completed in TASK-1
- Any changes to `page.tsx`, `SenseCard.tsx`, or `api.ts` — all wiring above those layers is already correct

---

## Architecture

```txt
User clicks Difficulty Button
          │  onDifficultySelect(level)
          ▼
  handleDifficultySelect(level)   [ReviewArea.tsx]
          │
          ├── updateSenseReview(sense.id, level)  ── fire-and-forget PUT /senses/{id}/review
          │
          ├── setIsTransitioning(true)
          │       CSS wrapper: opacity-0 + translate-x-4
          │
          └── setTimeout(~150 ms)
                    │
                    ├── setIsTransitioning(false)
                    └── setCurrentIndex(prev => prev + 1)
                              │
                              ├── currentIndex < reviewQueue.length
                              │     → SenseCard for reviewQueue[currentIndex]
                              │       CSS wrapper: opacity-100 + translate-x-0
                              │
                              └── currentIndex === reviewQueue.length
                                    → ReviewCompleteScreen
                                          │
                                          ├── "Return to Vocabulary" → onNavigate("vocabulary")
                                          └── "Return to Learning"   → onNavigate("learning")
```

### Fire-and-forget update rationale

`updateSenseReview` is called without `await`. The card advances immediately, preserving the rapid flashcard rhythm. A network failure silently loses the rating for that card; accepted for v1 given the low-stakes consequence (the user can re-review the sense on the next session).

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/ReviewArea.tsx` | Update | Add `currentIndex` + `isTransitioning` state; destructure `onNavigate`; wire difficulty handler; animate card wrapper; render `ReviewCompleteScreen` on exhaustion; update progress counter |
| `frontend/src/components/ReviewCompleteScreen.tsx` | Create | Completion screen with two `onNavigate` buttons, styled with `forest-*` palette |

---

### Key Functions

**`handleDifficultySelect` in `ReviewArea.tsx`**

```typescript
function handleDifficultySelect(level: "Easy" | "Medium" | "Hard" | "VeryHard"): void
```

Fires the review update, triggers the CSS exit animation, and schedules the card advance.

- Calls `updateSenseReview(reviewQueue[currentIndex].id, level)` without `await` (fire-and-forget)
- Sets `isTransitioning = true` — the `SenseCard` wrapper gains `opacity-0 translate-x-4`
- Schedules `setTimeout(() => { setIsTransitioning(false); setCurrentIndex(i => i + 1); }, 150)`

**Render branching in `ReviewArea.tsx`**

```typescript
if (currentIndex >= reviewQueue.length) {
  return <ReviewCompleteScreen onNavigate={onNavigate} />;
}
```

Otherwise renders:

```tsx
<div className={clsx(
  "transition-all duration-150",
  isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
)}>
  <SenseCard
    sense={reviewQueue[currentIndex]}
    onDifficultySelect={handleDifficultySelect}
  />
</div>
```

Progress counter changes from the hardcoded `1` to `{currentIndex + 1}`:

```tsx
<p className="mb-4 text-sm text-forest-500 dark:text-forest-400 text-right">
  {currentIndex + 1} / {reviewQueue.length} senses
</p>
```

**`ReviewCompleteScreen` component**

```tsx
interface ReviewCompleteScreenProps {
  onNavigate: (area: "vocabulary" | "learning") => void;
}
```

Renders a centred card (consistent with the `bg-white dark:bg-forest-800 rounded-xl shadow-sm border` pattern) with:

- A completion heading
- "Return to Vocabulary Area" button → calls `onNavigate("vocabulary")`
- "Return to Learning Area" button → calls `onNavigate("learning")`

Both buttons follow the existing `forest-*` palette button style used throughout the app.

---

### Data Models / Schemas

No new data models. `SenseWithWord` and `Sense` types from `frontend/src/types/word.ts` are reused as-is.

---

### Testing Strategy

**Manual integration test (golden path):**

1. Run `just dev`
2. Navigate to Learning Area, select ≥ 2 senses, click "Start Review"
3. On each card, click any Difficulty Level button and verify:
   - Card fades out and slides right (opacity + translate-x transition, ~150 ms)
   - Next card appears; progress counter increments (e.g. "2 / 3 senses")
4. On the final card, click any Difficulty Level button → `ReviewCompleteScreen` renders
5. Click "Return to Vocabulary Area" → `WordTable` renders, `AreaToggle` reappears
6. Repeat steps 2–4, click "Return to Learning Area" → `SensesTable` renders

**Edge cases:**

- Single-sense queue: after the only card is rated, completion screen renders immediately
- Empty queue (`reviewQueue.length === 0`): existing empty-state fallback in `ReviewArea` must remain unchanged — ensure the `if (reviewQueue.length === 0)` guard stays above the `currentIndex >= reviewQueue.length` check
- Rapid clicking: multiple clicks before the 150 ms animation completes will stack `setCurrentIndex` updates via the functional updater form (`prev => prev + 1`), which is safe — verify the counter does not over-run past `reviewQueue.length`

---

### Open Questions / Risks

- [x] **Fire-and-forget failure visibility:** If `updateSenseReview` rejects, the user's rating is lost silently. Acceptable for v1; surface as a named future enhancement alongside cart persistence. **Target:** post-v1. **Answer:** Acceptable for v1.
- [x] **Rapid-click stacking:** Difficulty buttons remain enabled during `isTransitioning`. If rapid clicking causes `currentIndex` to exceed `reviewQueue.length`, the `>=` guard handles it safely, but the UX may feel glitchy. Consider disabling buttons while `isTransitioning === true` if observed during manual testing. **Target:** validate in step 3 of the manual test above. **Answer:** Validation through user acceptance tests.
