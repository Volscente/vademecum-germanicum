# #71: Add Sense Column to SensesTable

**GitHub Issue:** [#71 — Add Sense Column to SensesTable](https://github.com/Volscente/vademecum-germanicum/issues/71)
**GitHub Milestone:** [7-add-sense-meaning-learning-area](https://github.com/Volscente/vademecum-germanicum/milestone/9)
**Notion page:** [7 — Add Sense Meaning in Learning Area](https://www.notion.so/7-Add-Sense-Meaning-in-Learning-Area-3695cc6c0f0780be9eb9c0b0b7f57e3e)

---

## Technical Scope

**In scope:**

- `frontend/src/components/SensesTable.tsx` — add a "Sense" `<th>` header cell and a matching `<td>` per row rendering `sense.meaning_summary ?? '—'` with `max-w-xs truncate`

**Out of scope:**

- `frontend/src/types/word.ts` — `SenseWithWord` already carries `meaning_summary: string` via `Sense`; no type changes needed
- `frontend/src/lib/api.ts` — `getSenses()` already returns all `Sense` fields; no API changes needed
- `frontend/src/app/page.tsx` — passes no column-level props to `SensesTable`; no changes needed
- Vocabulary Area (`WordTable.tsx`), Review Area (`SenseCard.tsx`, `ReviewArea.tsx`), backend, database

---

## Architecture

```txt
GET /senses/
     │
     ▼
getSenses() → SenseWithWord[]
     │
     ▼
SensesTable (render only — no data-fetching changes)
┌───────────────────────────────────────────────────────┐
│  <thead>                                              │
│    <th>Word</th>  →  <th>Sense</th> (NEW)             │
│    <th>Translation</th>  …  <th>To Review</th>        │
│  </thead>                                             │
│  <tbody>                                              │
│    {senses.map(sense => (                             │
│      <td>{sense.word}</td>                            │
│      <td className="… max-w-xs truncate">             │
│        {sense.meaning_summary ?? '—'} (NEW)           │
│      </td>                                            │
│      …                                                │
│    ))}                                                │
│  </tbody>                                             │
└───────────────────────────────────────────────────────┘
     │
     ▼
onStartReview(selected: SenseWithWord[]) — unchanged
```

### Column placement

The "Sense" column is inserted immediately after "Word" (the word identifier column), making the final column order:

`checkbox | Word | Sense | Translation | Category | Difficulty | Last Reviewed | To Review`

This places the meaning description next to the word it qualifies, before any metadata or actionable badge — matching the left-to-right information hierarchy of the existing table.

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/SensesTable.tsx` | Modify | Add "Sense" `<th>` in the header row and a matching `<td>` in each body row |

---

### Key Changes

Two surgical additions to `frontend/src/components/SensesTable.tsx`. No other files change.

**1. New header cell** — insert after the "Word" `<th>` (currently line 70):

```tsx
<th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
  Sense
</th>
```

**2. New body cell** — insert after the "Word" `<td>` (currently line 116) inside the `senses.map(...)` block:

```tsx
<td
  className="px-3 py-3 text-sm text-forest-600 dark:text-forest-200 max-w-xs truncate"
  title={sense.meaning_summary || undefined}
>
  {sense.meaning_summary || '—'}
</td>
```

`SenseWithWord.meaning_summary` is typed as `string` (non-nullable) in `frontend/src/types/word.ts:16`, inherited via `Sense`. The `|| '—'` fallback (rather than `??`) guards against empty strings `""` in addition to `null`/`undefined`, ensuring the cell is always visibly populated. The `title` attribute exposes the full string on hover when the value is truncated.

---

### CLI Parameters

N/A — this is a UI component change with no CLI surface.

---

### Data Models / Schemas

No changes. `SenseWithWord` (declared in `frontend/src/types/word.ts:23`) already embeds `meaning_summary` via `Sense`:

```typescript
// frontend/src/types/word.ts (current, no edits needed)
export interface Sense {
  id?: number;
  meaning_summary: string;   // already present — string, not nullable
  register: "Formal" | "Colloquial" | "Neutral" | "Technical";
  difficulty_level?: "Easy" | "Medium" | "Hard" | "VeryHard";
  last_reviewed_at?: string | null;
  grammar_patterns: GrammarPattern[];
  example_sentences: ExampleSentence[];
}

export interface SenseWithWord extends Sense {
  word: string;
  translation: string;
  // … inherits meaning_summary from Sense
}
```

---

### Testing Strategy

**Manual integration test:**

```bash
just dev
```

Navigate to the Learning Area. Verify:

1. The table header shows a "Sense" column between "Word" and "Translation".
2. Each row renders the `meaning_summary` text in the new column.
3. Rows with an empty or missing `meaning_summary` display `—` rather than a blank cell.
4. Long `meaning_summary` values are truncated at the cell boundary; hovering reveals the full text via the `title` attribute.
5. Multi-select checkboxes, "Start Review" button, card progression, and the review session work without regression.

**Edge cases:**

- `meaning_summary = ""` (empty string) → `|| '—'` renders `—`; `?? '—'` would render blank — prefer `||` for visible fallback
- `meaning_summary` is very long → `truncate` clips at `max-w-xs`; `title` exposes full text on hover
- All senses deselected → "Start Review" button remains hidden (unchanged behaviour)

---

### Open Questions / Risks

- [x] **Empty-string fallback operator:** The spec uses `||` (renders `—` for `""`) rather than `??` (renders blank for `""`). Confirm this is the desired behaviour before committing. **Target:** Implementation start. **Answer:** The spec proposal is okay.
- [x] **Snapshot / visual regression tests:** Check whether any existing tests assert on `SensesTable` HTML structure; update any that do. **Target:** During implementation. **Answer:** Check during unit tests execution.
