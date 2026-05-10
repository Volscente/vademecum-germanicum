# #49: Global "Collapse All" Button

**GitHub Issue:** [#49 — Global "Collapse All" Button](https://github.com/Volscente/vademecum-germanicum/issues/49)
**GitHub Milestone:** [4-collapsable-cards](https://github.com/Volscente/vademecum-germanicum/milestone/4-collapsable-cards)
**Notion page:** [4-Collapsable Cards](https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375)

---

## Technical Scope

**In scope:**

- `frontend/src/components/EditWordModal.tsx` — Add a "Collapse All" button to the modal header row; wire a click handler that bulk-sets `verbMorphologyCollapsed = true` and every `sensesCollapsed` entry to `true`

**Out of scope:**

- Any changes to `wordSchema.ts`, `api.ts`, `types/word.ts`, or any other component
- An "Expand All" button (not requested)
- Persisting collapse state across modal open/close cycles

---

## Architecture

```txt
EditWordModal — modal header row
  ├── [Re-enrich]  [Delete]  [×]          (existing controls)
  └── [Collapse All]                       (new button)
            │
            ▼ onClick: handleCollapseAll()
            ├── setVerbMorphologyCollapsed(true)   ── collapses Verb Morphology card
            └── setSensesCollapsed(prev =>          ── collapses every Sense card
                  prev.map(() => true))
```

### Why bulk-set instead of a shared "all collapsed" flag

`verbMorphologyCollapsed` and `sensesCollapsed` are independent state slices introduced in TASK-1 and TASK-2. Merging them into a shared flag would require refactoring both prior tasks. Since "Collapse All" is a one-way bulk write (not a toggle), reading and overwriting each slice directly is the simplest approach with no structural change.

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                                      |
| --------------------------------------------- | ------ | ---------------------------------------------------------------- |
| `frontend/src/components/EditWordModal.tsx`   | Edit   | Add `handleCollapseAll` handler and "Collapse All" button in the modal header |

---

### Key Functions

```typescript
const handleCollapseAll = () => {
  setVerbMorphologyCollapsed(true);
  setSensesCollapsed((prev) => prev.map(() => true));
};
```

Both state setters (`setVerbMorphologyCollapsed`, `setSensesCollapsed`) are already declared in scope from TASK-1 and TASK-2. No new state variables are needed.

**Button placement** — inside the modal header row alongside the existing Re-enrich, Delete, and Close controls. Use existing Tailwind utility classes (e.g., `text-sm text-forest-700 hover:text-forest-900 dark:text-forest-300`) to match adjacent button styling.

---

### Testing Strategy

**Manual (golden path):**

1. Open `EditWordModal` for a verb word with at least two Senses.
2. Verify all cards start expanded.
3. Click "Collapse All".
4. Verify the Verb Morphology card collapses to its summary header.
5. Verify every Sense card collapses to its summary header.

**Edge cases:**

- Word with no Senses (empty `fields` array) → `sensesCollapsed` is `[]`; clicking "Collapse All" is a no-op for senses, Verb Morphology still collapses correctly.
- Non-verb word (`category !== 'verb'`) → Verb Morphology card is not rendered; "Collapse All" only affects `sensesCollapsed` entries; no error thrown.
- Cards already individually collapsed before clicking "Collapse All" → handler is idempotent; no visual change, no state corruption.
- Click "Collapse All", then individually expand one card → that card expands independently; state for other cards is unaffected.

---

### Open Questions / Risks

- [x] **Button label and placement:** "Collapse All" as text button in the header row is assumed; confirm placement doesn't crowd the existing Re-enrich/Delete/Close controls on small viewports. **Target:** during implementation. **Aswer:** Place the "Collapse All" button just above the "Verb Morphology" card.
