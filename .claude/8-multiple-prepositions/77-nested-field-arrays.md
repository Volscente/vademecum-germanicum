# #77: Nested Field Arrays

**GitHub Issue:** [#77 — Nested Field Arrays](https://github.com/Volscente/vademecum-germanicum/issues/77)
**GitHub Milestone:** [8-multiple-prepositions](https://github.com/Volscente/vademecum-germanicum/milestone/10)
**Notion page:** [8-Multiple-Prepositions](https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def)

---

## Technical Scope

**In scope:**

- `frontend/src/components/GrammarPatternFields.tsx` — new sub-component; owns the nested `useFieldArray` for grammar patterns per sense
- `frontend/src/components/AddWordModal.tsx` — replace inline grammar-pattern `.map()` with `<GrammarPatternFields>`
- `frontend/src/components/EditWordModal.tsx` — same `<GrammarPatternFields>` wire-up; add collapsible card wrapper for the Grammar Patterns section; add `grammarPatternsCollapsed: boolean[]` state

**Out of scope:**

- `frontend/src/lib/wordSchema.ts` — `grammar_patterns: z.array(grammarPatternSchema).min(1)` is already correct (confirmed in TASK-1); no changes
- `frontend/src/types/word.ts` — `GrammarPattern[]` is already correctly typed on `Sense` and `WordEnrichment`; no changes
- `frontend/src/components/SenseCard.tsx` — read-only flashcard; surfacing multiple grammar patterns there is deferred
- Backend — no schema changes, no migrations, no new endpoints
- Enrichment mapping (`onEnrich` / `onReEnrich`) — both already call `reset({ ..., senses: enriched.senses })` passing the full `Sense[]` array with all `grammar_patterns`; no truncation found (verified in TASK-3 audit pre-check)

---

## Architecture

```txt
AddWordModal                               EditWordModal
      │                                          │
      │  senseFields.map((field, sIdx))          │  senseFields.map((field, sIdx))
      │          │                               │          │
      │          │                               │          ├── [Collapsible sense card]
      │          │                               │          │        │
      │          │                               │          │        ├── Meaning Summary, Register
      │          │                               │          │        │
      │          │                               │          │        └── [Collapsible GP card]
      │          │                               │          │                  │
      │          └─► <GrammarPatternFields        │          └──────────────────►<GrammarPatternFields
      │                senseIndex={sIdx}         │                               senseIndex={sIdx}
      │                control={control}         │                               control={control}
      │                errors={errors} />        │                               errors={errors} />
      │                                          │
      │                                          └── grammarPatternsCollapsed: boolean[]
      │                                              synced via useEffect on senseFields.length
      │
GrammarPatternFields (sub-component — owns the nested field array)
      │
      ├── useFieldArray({ control, name: `senses.${senseIndex}.grammar_patterns` })
      │
      ├── fields.map((gpField, gpIdx) =>
      │         ├── <input register(`senses.${sIdx}.grammar_patterns.${gpIdx}.preposition`)>
      │         ├── <select register(`senses.${sIdx}.grammar_patterns.${gpIdx}.case`)>
      │         └── Remove button (disabled when fields.length === 1)
      │
      └── Add Grammar Pattern → append({ preposition: null, case: "Akkusativ" })
```

### Why a dedicated sub-component is mandatory

React Hook Form's `useFieldArray` must be called unconditionally from a component body. Calling it inside a `.map()` callback violates the Rules of Hooks and produces a runtime error. `GrammarPatternFields` is the only correct pattern for a nested field array inside a sense loop. Each instance is independent — its field array is keyed to its `senseIndex`, so index management is isolated per sense.

---

## Tech Stack

No new packages required. `react-hook-form` `useFieldArray` and the existing Zod schemas cover the requirement.

---

## Implementation Details

### Modules / Files

| File                                                    | Action | Description                                                                              |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `frontend/src/components/GrammarPatternFields.tsx`      | Create | Sub-component encapsulating the nested `useFieldArray` for grammar patterns per sense   |
| `frontend/src/components/AddWordModal.tsx`              | Update | Replace inline grammar-pattern rows with `<GrammarPatternFields>`                        |
| `frontend/src/components/EditWordModal.tsx`             | Update | Replace inline grammar-pattern rows with `<GrammarPatternFields>` + collapsible card    |

---

### Key Functions / Components

```tsx
// GrammarPatternFields.tsx

interface GrammarPatternFieldsProps {
  senseIndex: number;
  control: Control<WordFormValues>;
  errors: FieldErrors<WordFormValues>;
}

export default function GrammarPatternFields({
  senseIndex,
  control,
  errors,
}: GrammarPatternFieldsProps): JSX.Element
```

- Calls `useFieldArray({ control, name: \`senses.${senseIndex}.grammar_patterns\` })`.
- Renders one row per `fields` entry: a preposition `<input>` (registered to `senses.${senseIndex}.grammar_patterns.${gpIdx}.preposition`) and a case `<select>` (registered to `senses.${senseIndex}.grammar_patterns.${gpIdx}.case`) sharing the same `register` call.
- Renders a Remove `<Trash2>` button per row; disabled when `fields.length === 1`.
- Renders an "Add Grammar Pattern" `<PlusCircle>` button that calls `append({ preposition: null, case: "Akkusativ" })`.
- Displays per-row validation errors from `errors.senses?.[senseIndex]?.grammar_patterns?.[gpIdx]`.

---

### AddWordModal.tsx changes

Replace the inline Grammar Patterns block (currently iterating over `watchedSenses[sIdx]?.grammar_patterns`) with:

```tsx
<GrammarPatternFields
  senseIndex={sIdx}
  control={control}
  errors={errors}
/>
```

`watchedSenses` remains needed for the Example Sentences section — do not remove the `watch("senses")` call.

---

### EditWordModal.tsx changes

**1. `grammarPatternsCollapsed` state** — one boolean per sense; mirrors `sensesCollapsed`.

```tsx
const [grammarPatternsCollapsed, setGrammarPatternsCollapsed] = useState<boolean[]>([]);
```

**2. `useEffect` sync** — identical pattern to the existing `sensesCollapsed` sync; triggers on `senseFields.length` changes to handle append, remove, and Re-enrich reset:

```tsx
useEffect(() => {
  setGrammarPatternsCollapsed((prev) => {
    if (senseFields.length > prev.length) {
      return [...prev, ...Array(senseFields.length - prev.length).fill(false)];
    }
    return prev.slice(0, senseFields.length);
  });
}, [senseFields.length]);
```

**3. `handleCollapseAll` extension** — add `setGrammarPatternsCollapsed((prev) => prev.map(() => true))` alongside the existing `sensesCollapsed` collapse.

**4. Collapsible Grammar Patterns card** inside each sense's card body (replicating the Verb Morphology `max-h` toggle pattern):

```tsx
{/* Grammar Patterns */}
<div className="border border-forest-200 dark:border-forest-600 rounded-lg p-3">
  <button
    type="button"
    onClick={() =>
      setGrammarPatternsCollapsed((prev) =>
        prev.map((c, i) => (i === sIdx ? !c : c)),
      )
    }
    className="flex w-full items-center gap-2"
  >
    {grammarPatternsCollapsed[sIdx] ? (
      <ChevronDown className="w-3 h-3 text-forest-600 dark:text-forest-300" />
    ) : (
      <ChevronUp className="w-3 h-3 text-forest-600 dark:text-forest-300" />
    )}
    <span className="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide">
      Grammar Patterns
    </span>
    {!!errors.senses?.[sIdx]?.grammar_patterns && grammarPatternsCollapsed[sIdx] && (
      <span className="ml-auto h-2 w-2 rounded-full bg-red-500" aria-label="Contains errors" />
    )}
  </button>
  <div
    className={clsx(
      "overflow-hidden transition-[max-height] duration-300",
      grammarPatternsCollapsed[sIdx] ? "max-h-0" : "max-h-500",
    )}
  >
    <div className="pt-2">
      <GrammarPatternFields
        senseIndex={sIdx}
        control={control}
        errors={errors}
      />
    </div>
  </div>
</div>
```

Replace the existing inline Grammar Patterns block (currently iterating over `watchedSenses[sIdx]?.grammar_patterns`) with the block above.

---

### Data Models / Schemas

No new data models. The relevant types already exist:

```ts
// wordSchema.ts (no changes)
grammar_patterns: z.array(grammarPatternSchema).min(1)  // inside senseSchema

// word.ts (no changes)
interface GrammarPattern {
  id?: number;
  preposition: string | null;
  case: "Nominativ" | "Akkusativ" | "Dativ" | "Genitiv";
}
```

The `Control<WordFormValues>` and `FieldErrors<WordFormValues>` types are inferred from `wordSchema` and `useForm` — no new type declarations required.

---

### Testing Strategy

**Step 0 — Payload shape verification (nested path guard)**

Before running any UI smoke test, after wiring `GrammarPatternFields` into both modals, perform this check first:

1. Start the app (`just dev`).
2. Open **Add Word Modal** → fill in a word manually → add two grammar-pattern rows per sense with distinct values.
3. Open the browser Network tab (DevTools → Network → filter by `words`).
4. Submit the form.
5. Inspect the request payload: each sense object must carry `grammar_patterns` as an array of two objects, each with `preposition` and `case` fields populated. If `grammar_patterns` is missing, `undefined`, or contains only one entry, the `name` path in `useFieldArray` or `register` is wrong — fix before proceeding.

This is a mandatory first check because an incorrect `name` path yields `undefined` silently with no runtime error.

**Manual smoke test (golden path — Add Word Modal):**

1. Open **Add Word Modal** → type a word → click **Enrich**.
2. Verify multiple grammar-pattern rows are pre-populated per sense (if the LLM returns more than one).
3. Add a second grammar pattern row via "Add Grammar Pattern" — verify a new row appears with default `preposition=null`, `case=Akkusativ`.
4. Attempt to remove the last row — verify the Remove button is disabled.
5. Remove a non-last row — verify the remaining rows preserve their values.
6. Submit the word — confirm payload in Network tab: each sense carries `grammar_patterns` as an array with all rows (same check as Step 0).

**Manual smoke test (golden path — Edit Word Modal):**

1. Open **Edit Word Modal** for a word that has multiple senses.
2. Verify Grammar Patterns collapsible card renders inside each sense card.
3. Collapse and expand the Grammar Patterns card via header click.
4. Click **Collapse All** — verify the Grammar Patterns cards also collapse (alongside Verb Morphology and Sense cards).
5. Add a grammar pattern row, remove a non-last row, verify min-1 guard.
6. Click **Re-enrich** — verify all grammar patterns from the LLM response are pre-populated (multi-row if the LLM returns multiple).
7. Save — confirm PUT payload in Network tab: each sense carries all grammar pattern rows.

**Edge cases:**

- Sense with exactly one grammar pattern → Remove button disabled in both modals.
- Sense with two+ grammar patterns → Remove button enabled for all; after removing one, the remaining row's field values are preserved correctly (no index collision between sense indices).
- After Re-enrich, Grammar Patterns collapsible cards reset to expanded (same behaviour as Sense cards).

---

### Open Questions / Risks

- [x] **Nested path silent failure:** An incorrect `name` path in `useFieldArray` yields `undefined` without a runtime error. **Resolved:** promoted to a mandatory Step 0 payload-shape check in Testing Strategy — verify the Network tab payload before any other UI smoke testing.
- [x] **`max-h-500` class availability:** **Resolved:** `EditWordModal.tsx` already uses `max-h-500` on two existing collapsible sections (Verb Morphology at line 306, Sense cards at line 404) and those work in the current app. Tailwind v4's JIT generates `max-height: 125rem` for this class. No config change required — reuse the same class.
