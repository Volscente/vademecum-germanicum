# [RFC] Add Sense Meaning in Learning Area — Vademecum Germanicum

| Author          | Simone Porreca                                                                        |
| :-------------- | :------------------------------------------------------------------------------------ |
| **Project**     | Vademecum Germanicum                                                                  |
| **RFC status**  | Draft                                                                                 |
| **Review deadline** | 2026-05-25                                                                        |
| **Notion page** | [7 — Add Sense Meaning in Learning Area](https://www.notion.so/7-Add-Sense-Meaning-in-Learning-Area-3695cc6c0f0780be9eb9c0b0b7f57e3e) |
| **GitHub repo** | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)   |
| **Milestone**   | [7-add-sense-meaning-learning-area](https://github.com/Volscente/vademecum-germanicum/milestone/9) |

### Timeline

| Date       | Status | Note    |
| :--------- | :----- | :------ |
| 2026-05-25 | Draft  | Created |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[Add Sense Meaning in Learning Area](#add-sense-meaning-in-learning-area)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The Learning Area table (`SensesTable`) currently omits the "Sense Meaning" field, which describes what a particular sense of a word actually means. Because a word can have multiple senses, rows for the same word are visually indistinguishable, making it impossible for the user to identify which sense is which at a glance. Adding a dedicated "Sense" column that surfaces the `meaning_summary` field will resolve this ambiguity without requiring any backend or API changes. For full context, see the [Notion initiative page](https://www.notion.so/7-Add-Sense-Meaning-in-Learning-Area-3695cc6c0f0780be9eb9c0b0b7f57e3e).

## Objectives {#objectives}

- **Display sense meaning**: The Learning Area table renders a "Sense" column containing `meaning_summary` for every row, so same-word senses are visually distinguishable.
- **Handle missing data gracefully**: Rows whose `meaning_summary` is `null` or empty display a clear fallback (em-dash) rather than a blank or crash.
- **Preserve the review workflow**: Multi-select, "Start Review", card progression, and the `onStartReview` public interface of `SensesTable` remain byte-for-byte unchanged.
- **Zero backend surface change**: The solution relies exclusively on the data already returned by `GET /senses/`; no new endpoints, schema changes, or API calls are introduced.

## Scope {#scope}

**In-Scope:**

- Learning Area table (`SensesTable.tsx`) — adding the "Sense" column

**Out-of-Scope:**

- **Vocabulary Area**: this RFC targets the Learning Area only; the Vocabulary Area table (`WordTable`) already surfaces `meaning_summary` via `senses[0]?.meaning_summary`.
- **Review Area**: the review card (`SenseCard`) already shows full sense details; no changes are needed there.

**Constraints:**

- No backend or API changes — the solution must rely solely on data already returned by `getSenses()` (`GET /senses/`).
- The `SensesTable` component must continue to satisfy its public interface: `<SensesTable onStartReview>`.

---

# **Add Sense Meaning in Learning Area** {#add-sense-meaning-in-learning-area}

## Approach Overview {#approach-overview}

The `SenseWithWord` type (declared in `src/types/word.ts`) already embeds all `Sense` fields, which includes `meaning_summary`. `getSenses()` in `src/lib/api.ts` already returns `SenseWithWord[]` from `GET /senses/`, so the field is available in `SensesTable.tsx` with no data-fetching or type changes required.

The entire change is a UI-layer addition inside `SensesTable.tsx`: one new `<th>` labelled "Sense" and one new `<td>` per row rendering `sense.meaning_summary ?? '—'`. The column is inserted between the word identifier column and the "To Review" badge column to match the visual rhythm of the table. Long values should be capped with a CSS `max-w` / `truncate` class to prevent layout overflow.

The author's stated approach direction is adopted in full — it is both technically sound and minimal. The existing precedent in `WordTable.tsx` (`senses[0]?.meaning_summary ?? ''`) confirms the pattern is already established in the codebase.

## Integration {#integration}

The change touches exactly one file: `src/components/SensesTable.tsx`. The data flow is unchanged:

```
getSenses() → SenseWithWord[] → SensesTable (render only)
```

- `src/types/word.ts` — `SenseWithWord` already carries `meaning_summary`; no edits needed.
- `src/lib/api.ts` — `getSenses()` already returns the field; no edits needed.
- `src/app/page.tsx` — passes no column-level props to `SensesTable`; no edits needed.
- `ReviewArea`, `SenseCard`, `WordTable` — untouched.

## Tech Stack {#tech-stack}

- **Next.js (v16)**: the existing React framework; `SensesTable.tsx` is a standard React component, so no new framework primitives are required.
- **Tailwind CSS (v4)**: used for all existing table styling; the new column will use existing utility classes (`truncate`, `max-w-xs`, `text-sm`, etc.) consistent with the current table.
- **TypeScript**: `SenseWithWord` is already typed; the `meaning_summary` field is `string | null | undefined`, informing the `?? '—'` fallback.

## Effort Estimations {#effort-estimations}

Total estimated effort: **0.5 session**.

| Milestone          | Description                                                       | Est. effort | GitHub Issue |
| :----------------- | :---------------------------------------------------------------- | :---------- | :----------- |
| M1 — Sense column  | Add "Sense" `<th>` and `<td>` to `SensesTable.tsx`; null fallback; CSS truncation | 0.5 session | #71 |

### Recommended Order

1. M1 — Sense column (self-contained; no dependencies)

---

# **FAQs** {#faqs}

**Q: Why is no backend change needed?**

A: `getSenses()` calls `GET /senses/` and returns `SenseWithWord[]`. The `SenseWithWord` type embeds all `Sense` fields, including `meaning_summary`, which the backend already populates. The data has always been present in the API response; it simply was not rendered in the table.

**Q: Why not reuse the `WordTable` "Meaning" column approach?**

A: `WordTable` is a separate component serving the Vocabulary Area. It renders `senses[0]?.meaning_summary` — the first sense of a word. `SensesTable` operates at the sense level (one row per sense), so `meaning_summary` is read directly from the row's sense object, not indexed. The pattern is the same idiom applied at a different granularity.

**Q: Where should the "Sense" column appear in the table?**

A: Between the word identifier column and the "To Review" badge. This places the contextual description next to the word it qualifies, before the actionable badge, which matches the left-to-right information hierarchy of the existing table.

**Q: What happens if `meaning_summary` is very long?**

A: Long values are capped with a Tailwind `max-w-xs truncate` combination on the `<td>`, consistent with how other text columns are handled. A `title` attribute can optionally expose the full value on hover.

**Q: Terminology?**

A:

- **Sense** → a single meaning or usage of a German word (one word can have multiple senses).
- **`meaning_summary`** → a short human-readable description of a sense, stored on the `Sense` model and returned in `SenseWithWord`.
- **RFC** → Request for Comments — a design document used to propose and discuss a change before implementation.

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question                                                                 | Likelihood | Mitigation / Answer                                                                                      |
| :------------------------------------------------------------------------------ | :--------- | :------------------------------------------------------------------------------------------------------- |
| `meaning_summary` is `null` or empty for senses created before the field existed | Medium     | Render `sense.meaning_summary ?? '—'` so the cell is always populated with a visible placeholder.       |
| Long `meaning_summary` strings break table layout or overflow the viewport      | Low        | Apply `max-w-xs truncate` CSS on the `<td>`; optionally add `title={sense.meaning_summary}` for hover.  |
| Existing snapshot or visual regression tests break due to the new column        | Low        | Verify that no existing tests assert on `SensesTable` HTML structure; update any that do.               |

## References {#references}

- [Frontend README](../../frontend/README.md)
- [Notion initiative page](https://www.notion.so/7-Add-Sense-Meaning-in-Learning-Area-3695cc6c0f0780be9eb9c0b0b7f57e3e)
- [GitHub Milestone](https://github.com/Volscente/vademecum-germanicum/milestone/9)
