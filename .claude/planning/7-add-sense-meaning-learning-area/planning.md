# Add Sense Meaning in Learning Area — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [7-add-sense-meaning-learning-area](https://github.com/Volscente/vademecum-germanicum/milestone/9)
**Notion page:** [7 — Add Sense Meaning in Learning Area](https://www.notion.so/7-Add-Sense-Meaning-in-Learning-Area-3695cc6c0f0780be9eb9c0b0b7f57e3e)
**Total estimated effort:** 0.5 FTE-days (1 FTE = 1 day)

---

## Overview

This initiative adds a "Sense" column to the Learning Area table (`SensesTable.tsx`) that renders the `meaning_summary` field already present on each `SenseWithWord` object returned by `getSenses()`. The change is confined to a single UI component; no backend, API, type, or data-fetching changes are required. The review workflow and `SensesTable`'s public interface remain unchanged.

### Dependency Order

```txt
TASK-1
```

---

## TASK-1 — Add Sense Column to SensesTable

**GitHub Issue:** #71
**Effort estimate:** 0.5 FTE-days

### Scope

Add a "Sense" `<th>` header and a corresponding `<td>` cell to every row in `SensesTable.tsx`. The cell renders `sense.meaning_summary ?? '—'`, truncated with Tailwind's `max-w-xs truncate` utilities. The column is inserted between the word identifier column and the "To Review" badge column.

### Goal

Same-word senses in the Learning Area table become visually distinguishable by their meaning summary, with a graceful fallback for rows where `meaning_summary` is absent.

### Deliverables

- `src/components/SensesTable.tsx` — new "Sense" `<th>` in the table header and matching `<td>` in each row body rendering `sense.meaning_summary ?? '—'` with `max-w-xs truncate` CSS

### Technical Overview

`SenseWithWord` (declared in `src/types/word.ts`) already embeds all `Sense` fields, including `meaning_summary: string | null | undefined`. The `getSenses()` call in `src/lib/api.ts` (`GET /senses/`) already returns this field, so no data-fetching or type changes are needed. The null-coalescing fallback `?? '—'` follows the same pattern already used in `WordTable.tsx` (`senses[0]?.meaning_summary ?? ''`). The `max-w-xs truncate` Tailwind combination caps long values at cell boundary; a `title` attribute can optionally expose the full string on hover. The `onStartReview` prop and multi-select logic are untouched.

---

## GitHub Issues

### Milestone 1 — Sense Column

**Tasks:** TASK-1
**Effort:** 0.5 FTE-days

#### Scope

Modify `SensesTable.tsx` to include a new "Sense" table column that surfaces `meaning_summary` from the existing `SenseWithWord` payload. No other files are changed.

#### Goal

The Learning Area table displays a "Sense" column for every row, with an em-dash fallback for missing values, and all existing review functionality continues to work without modification.

#### Deliverables

- Updated `src/components/SensesTable.tsx` with "Sense" column (`<th>` + `<td>`)
- Null/empty fallback rendering `'—'` for rows without `meaning_summary`
- CSS truncation applied to the new column cells
