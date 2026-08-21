# #87: Block Save and Disable Enrich on Duplicate

**GitHub Issue:** [#87 — Block Save and Disable Enrich on Duplicate](https://github.com/Volscente/vademecum-germanicum/issues/87)
**GitHub Milestone:** [9-check-word-already-exist](https://github.com/Volscente/vademecum-germanicum/milestone/11)
**Notion page:** [9 — Check word already existing](https://app.notion.com/p/9-Check-word-already-existing-3925cc6c0f0780cb929ffeeee7632263)

---

## Technical Scope

**In scope:**

- `frontend/src/components/AddWordModal.tsx` — gate the "Save Word" submit button and the "Enrich" button on the `isDuplicate` state delivered in [#86](86-frontend-real-time-duplicate-notification.md)

**Out of scope:**

- Backend and duplicate-detection logic — `checkWordExists`, the `words_word_key` constraint, the 409 handler, and the debounced `isDuplicate` state itself were delivered in [#85](85-backend-duplicate-check-support.md) and [#86](86-frontend-real-time-duplicate-notification.md) and are reused unchanged
- `EditWordModal.tsx` — creation flow only (RFC out-of-scope)
- Any new warning text or styling beyond the `title` tooltip described below — the inline `errors.word` message from #86 already communicates the duplicate to the user

---

## Architecture

```txt
isDuplicate state (boolean)                     [set by the useEffect from #86, unchanged here]
        │
        ├──► Enrich button disabled prop
        │      disabled={!wordValue || isEnriching || isDuplicate}   (existing condition, extended)
        │      title={isDuplicate ? "This word already exists in your vocabulary." : undefined}
        │
        └──► Save Word (submit) button disabled prop
               disabled={isDuplicate}                                 (new — no prior disabled prop existed)
```

### Correcting the planning doc's assumption about the submit button

`planning.md` (TASK-3) describes this as "`|| isDuplicate` added to the submit button `disabled` condition" — implying an existing condition to extend. Reading the current `AddWordModal.tsx` (lines 381–386, as left by #86) shows the "Save Word" button has **no `disabled` prop at all**:

```tsx
<button
  type="submit"
  className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded transition-colors"
>
  Save Word
</button>
```

There is nothing to append `|| isDuplicate` to. This spec adds a fresh `disabled={isDuplicate}` prop instead. Conversely, the Enrich button *does* already carry a condition — `disabled={!wordValue || isEnriching}` (line 181) — so on that button `|| isDuplicate` is correctly appended to the existing expression, not written fresh (writing `disabled={isDuplicate}` there, as one reading of the planning doc's deliverables line could suggest, would silently drop the `!wordValue || isEnriching` guards — a regression). The net behaviour (both actions blocked while `isDuplicate` is `true`) matches the RFC and planning doc's intent; only the mechanics of *which* button gets appended-to vs. added-fresh are corrected against the real file.

---

## Tech Stack

No new packages required. `isDuplicate` already exists in component state (from #86); this task only reads it in two `disabled` expressions and one `title` expression.

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                                                          |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `frontend/src/components/AddWordModal.tsx`      | Edit   | Extend the Enrich button's `disabled` condition and `title`; add `disabled` to Save Word |

---

### Key Functions

This task changes JSX props only — no new functions, hooks, or handlers.

```tsx
{/* Enrich button — frontend/src/components/AddWordModal.tsx, ~line 178 */}
<button
  type="button"
  onClick={onEnrich}
  disabled={!wordValue || isEnriching || isDuplicate}
  title={isDuplicate ? "This word already exists in your vocabulary." : undefined}
  className="flex items-center gap-1 px-3 py-2 rounded bg-forest-100 dark:bg-forest-700 text-forest-700 dark:text-forest-200 hover:bg-forest-200 dark:hover:bg-forest-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
>
  <Sparkles className="w-4 h-4" />
  {isEnriching ? "Enriching…" : "Enrich"}
</button>
```

```tsx
{/* Save Word (submit) button — frontend/src/components/AddWordModal.tsx, ~line 381 */}
<button
  type="submit"
  disabled={isDuplicate}
  className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
>
  Save Word
</button>
```

The submit button's `className` gains `disabled:opacity-40 disabled:cursor-not-allowed` (the same disabled-state utility classes already used on the Enrich and sense-remove buttons, e.g. line 182 and line 299) so the disabled state is visibly distinguishable — the current `className` has no `disabled:` variants at all, since the button never had a `disabled` prop before.

---

### CLI Parameters

Not applicable — this is a React component with no CLI surface.

---

### Data Models / Schemas

No new models or schemas. No new state — `isDuplicate` already exists from #86 and is only read, not written, by this task.

---

### Testing Strategy

No automated frontend test runner exists in this project (`frontend/package.json` only defines `dev`, `build`, `start`, `lint`), so verification is manual via `just dev`, consistent with #85 and #86.

**Manual verification** (`just dev`, then in the browser):

- Type a word that already exists and wait >300 ms for the duplicate warning (from #86) → both "Enrich" and "Save Word" become visually disabled (`opacity-40`, `cursor-not-allowed`) and unclickable.
- Hover the disabled "Enrich" button while a duplicate is detected → the tooltip reads "This word already exists in your vocabulary."
- Clear the duplicate word and type a new, non-existent word → both buttons re-enable as soon as `isDuplicate` resets to `false` (subject to the existing `!wordValue || isEnriching` guards on Enrich).
- With an empty "word" field, confirm "Enrich" is still disabled via the pre-existing `!wordValue` condition (unaffected by this change) and "Save Word" is enabled (Zod's `min(1)` on `word` will block empty submission at `handleSubmit`, as before).

**Edge cases:**

- `isEnriching === true` and `isDuplicate === true` simultaneously (unlikely in practice, since typing a new word resets `isDuplicate` to `false` before a re-enrich could complete) → Enrich stays disabled either way; no behaviour change needed.
- `isDuplicate` becomes `true` while the Enrich button's tooltip is already open (e.g. via keyboard focus) → the browser's native `title` tooltip updates on the next hover/focus cycle; no custom handling required.

---

### Open Questions / Risks

- [ ] **Submit button had no prior `disabled` styling:** confirmed by reading the current file (see "Correcting the planning doc's assumption" above) — this spec adds `disabled:opacity-40 disabled:cursor-not-allowed` to its `className` so the disabled state is visible, matching the pattern already used elsewhere in this component. **Target:** verify visually during manual testing above; no further action planned.
- [ ] **Should "Save Word" also get a `title` tooltip like Enrich?** Neither the RFC's M3 section nor the planning doc's TASK-3 deliverables mention one for the submit button — only for Enrich. This spec follows that scope as written. **Target:** revisit only if a future round of user feedback asks for it; no action planned now.
