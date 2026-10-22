# [HOTFIX] Add Word form does not allow adding additional example sentences

**Severity:** medium
**Affected versions:** v0.4.14
**GitHub Issue:** 92
**GitHub Repo:** Volscente/vademecum-germanicum
**Tech stack:** Next.js 16, React 19, TypeScript, react-hook-form, Zod, Tailwind CSS v4

---

## Symptom

When creating a new word through the "Add Word" form, the user cannot add additional example sentences to a sense. The form offers no control to append another example, so the user cannot customise the example sentences beyond what is already present (e.g. what the AI enrichment pre-populated).

Additionally, the German and English parts of an example sentence are not easily identifiable in the UI.

---

## Root Cause Analysis

Confirmed against the code (the description's hypothesis holds).

In `frontend/src/components/AddWordModal.tsx` (lines 346–371), the "Example Sentences" block is not backed by a `useFieldArray`. It maps over `watchedSenses[sIdx]?.example_sentences` (the `watch("senses")` snapshot) and registers each row by index. There is no Add button, no Remove control, and no way to call `append`/`remove`. The only row ever shown is the one from `emptySense` (`example_sentences: [{ german: "", english: "" }]`) or whatever `onEnrich` → `reset()` loaded.

Grammar patterns, by contrast, are handled by `GrammarPatternFields.tsx`, which owns a nested `useFieldArray` with Add/Remove.

The German/English distinction currently relies solely on input placeholders ("German sentence" / "English translation"), which disappear as soon as the user types — hence the second symptom.

Secondary defect in the same block: rows use `key={exIdx}`, which is unsafe once rows can be removed (inputs would keep the wrong values/state). The field-array `field.id` fixes this.

---

## Technical Scope

**In scope**

- `frontend/src/components/ExampleSentenceFields.tsx` (new): nested field array for example sentences with Add/Remove and visible German/English labels.
- `frontend/src/components/AddWordModal.tsx`: replace the inline example-sentence block with the new component; remove `watchedSenses`, which becomes unused.

**Out of scope**

- Backend changes: the sense graph already supports multiple example sentences.
- Redesign of the Edit Word form: separate initiative, unless it shares the component being changed.
- Drag-to-reorder example sentences: not implemented project-wide.
- `wordSchema.ts` / `word.ts`: no change needed (`example_sentences` is already an array with `min(1)`, and `ExampleSentence` already has `german` / `english`).

---

## Implementation Details

### Modules / Files

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/ExampleSentenceFields.tsx` | Create | Reusable sub-component with a nested `useFieldArray` for `senses.{i}.example_sentences`; Add/Remove controls; labelled German and English inputs |
| `frontend/src/components/AddWordModal.tsx` | Modify | Render `<ExampleSentenceFields>` in place of the inline block; drop the now-unused `watchedSenses` |
| `frontend/README.md` | Modify | Document the new component, its public interface and a changelog entry (per project convention) |
| `frontend/package.json`, `backend/pyproject.toml`, `CHANGELOG.md` | Modify | Bump version together and add changelog entry (PR convention in CLAUDE.md) |

### Key Changes

**`ExampleSentenceFields.tsx`** — mirrors `GrammarPatternFields` (same props, same `inputClass`, same Add/Remove styling):

```tsx
interface ExampleSentenceFieldsProps {
  senseIndex: number;
  control: Control<WordFormValues>;
  errors: FieldErrors<WordFormValues>;
  register: UseFormRegister<WordFormValues>;
}

// Nested field array for a sense's example sentences; must be rendered as a component, not inside .map().
export default function ExampleSentenceFields(props: ExampleSentenceFieldsProps): JSX.Element
```

- Call `useFieldArray` with `control` and `name` set to the template string `senses.${senseIndex}.example_sentences`.
- Iterate `fields` with `key={field.id}`. Each row is a bordered card containing:
  - a visible `German` label above the German input and an `English` label above the English input (small `text-xs` labels, same palette as the Verb Morphology sub-labels), keeping the existing placeholders;
  - a Remove (`Trash2`) button, `disabled={fields.length === 1}` to preserve the `min(1)` invariant, same classes as `GrammarPatternFields`.
- Per-field error messages from `errors.senses?.[senseIndex]?.example_sentences?.[exIdx]?.german|english` (the Zod schema already defines "German sentence is required" / "English translation is required").
- "Add Example Sentence" button below the rows, `append({ german: "", english: "" })` (matches `ExampleSentence` and `exampleSentenceSchema`; empty strings, not `undefined`).
- Keep the existing "Example Sentences" heading text.

**`AddWordModal.tsx`**

- Import `ExampleSentenceFields`.
- Replace lines 346–371 (the `{/* Example Sentences */}` div and its `watchedSenses` map) with `<ExampleSentenceFields senseIndex={sIdx} control={control} errors={errors} register={register} />`, placed where the block was, directly after `<GrammarPatternFields … />`.
- Remove `const watchedSenses = watch("senses") ?? [];` (line 56): it is only used by the removed block. `watch` is still used for `category` and `word`.
- No change to `onEnrich`: `reset()` with `senses: enriched.senses` repopulates the nested field array automatically.

**Housekeeping (project convention)**

- Bump version in `frontend/package.json` and `backend/pyproject.toml` together, add a `CHANGELOG.md` entry, and add a README changelog entry plus a component line and `<ExampleSentenceFields …>` interface line in `frontend/README.md`.

---

## Verification

**Manual (local, `just dev`, http://localhost:3000)**

- Click "Add New Word", type a word.
- In a sense, click "Add Example Sentence" several times; each click adds a row with labelled German and English inputs.
- Type into a row and confirm the labels remain visible; confirm German and English are distinguishable in every row.
- Remove a middle row and confirm only that row disappears and the remaining rows keep their values.
- Confirm Remove is disabled when a single row remains.
- Click "Enrich" and confirm the enriched example sentences appear and more can still be added.
- Leave a row's German or English empty, submit, and confirm the Zod error appears under the right field.
- Add two senses and confirm each sense's example sentences are independent.
- Save, then reopen via `EditWordModal` and confirm all example sentences persisted.

**Automated**

```bash
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
```

No frontend test suite is documented in the README, so none is added. Backend tests are unaffected (no backend change); optionally `just run_tests` as a regression check.

**Edge cases**

- Removing the last-added row then adding again (no stale values).
- Enrich after manually adding rows (user rows are replaced — see risks).
- Dark mode: labels and borders readable.
- Long sentences wrapping within the `max-w-lg` modal.

---

## Open Questions / Risks

- [ ] **Hooks rule:** `ExampleSentenceFields` calls `useFieldArray` and must be rendered as a component, not inside a `.map()` callback (it is rendered once per sense inside the sense loop, which is fine). **Target:** TBD
- [ ] **Row shape:** new rows must be `{ german: "", english: "" }`, never `undefined`, to stay aligned with Zod and the backend contract. **Target:** TBD
- [ ] **Enrich overwrites user input:** `reset()` in `onEnrich` replaces the full sense payload, so manually added example sentences are lost if "Enrich" is clicked afterwards. Pre-existing behaviour; not changed by this hotfix. **Target:** TBD
- [ ] **Edit Word form (unverified):** `EditWordModal.tsx` was not in the context paths, so it is unknown whether it has the same missing Add/Remove controls. The component is built to be reusable, but wiring it into `EditWordModal` is out of scope unless you decide otherwise. **Target:** TBD
- [ ] **Removed `environments` field:** the description frontmatter no longer lists environments, so the header omits that row. **Target:** TBD
