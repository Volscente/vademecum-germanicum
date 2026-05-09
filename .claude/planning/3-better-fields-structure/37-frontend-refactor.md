# #37: Frontend Refactor

**GitHub Issue:** [#37 — Frontend Refactor](https://github.com/Volscente/vademecum-germanicum/issues/37)
**GitHub Milestone:** [3-better-fields-structure](https://github.com/Volscente/vademecum-germanicum/milestones)
**Notion page:** [3 — Better Fields Structure](https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc)

---

## Technical Scope

**In scope:**

- `frontend/src/types/word.ts` — Add `Sense`, `GrammarPattern`, `ExampleSentence` interfaces; update `Word` (add `auxiliary_verb`, `principal_forms`, `senses`) and `WordEnrichment` (add same fields)
- `frontend/src/lib/wordSchema.ts` — Extend Zod `wordSchema` with nested sense validation (`senseSchema`, `grammarPatternSchema`, `exampleSentenceSchema`)
- `frontend/src/components/AddWordModal.tsx` — Replace flat fields with a dynamic multi-sense form section; `useFieldArray` manages the sense list; enrichment pre-populates it
- `frontend/src/components/EditWordModal.tsx` — Full edit form: RHF + `useFieldArray` for senses, `PUT /words/{id}` on submit, "Re-enrich (replaces senses)" button, delete action retained
- `frontend/src/components/WordTable.tsx` — Change displayed column value from `translation` to `senses[0]?.meaning_summary ?? ''`; add `onWordUpdated` prop
- `frontend/src/lib/api.ts` — Add `updateWord(wordId, data): Promise<Word>` calling `PUT /words/{id}`

**Out of scope:**

- Backend: M1 (data model) and M2 (LLM enrichment) are already shipped; no backend changes
- `frontend/src/app/page.tsx` — Root page state and fetch logic are unchanged; `WordTable` handles the `onWordUpdated` callback internally
- Drag-to-reorder senses within `EditWordModal` or `AddWordModal`
- Lexical relationships (synonyms, antonyms) and audio generation

---

## Architecture

```txt
Backend API (port 8000) — already updated (M1 + M2 complete)
  GET  /words/        → WordRead[]      { senses: SenseRead[]   }
  POST /words/        ← WordCreate      { senses: SenseCreate[] }
  POST /words/enrich  → WordEnrichment  { senses: SenseCreate[] }
           │
           ▼
frontend/src/types/word.ts
  Word · WordEnrichment · Sense · GrammarPattern · ExampleSentence
           │
           ├──► frontend/src/lib/wordSchema.ts  (Zod: wordSchema / WordFormValues)
           │              │
           │    ┌─────────┴──────────────────────┐
           │    ▼                                 ▼
           │  AddWordModal                   EditWordModal
           │  - useFieldArray(senses)        - Collapsible SenseCard[]
           │  - "Enrich" fills senses[]      - collapsed: meaning_summary
           │  - "+ Add Sense" / "Remove"       register badge · pattern chips
           │  - POST /words/ on submit       - expanded: example_sentences
           │                                   tap-to-reveal English text
           │
           └──► frontend/src/components/WordTable.tsx
                  senses[0]?.meaning_summary ?? ''  (in place of translation)
```

### Why `wordSchema` is updated first

`wordSchema` in `wordSchema.ts` is the single source of truth for form validation. Both `AddWordModal` and `EditWordModal` must stay aligned with it. Updating the Zod schema before touching either modal ensures the TypeScript type `WordFormValues` (inferred from the schema) propagates correct shapes to both components without a window of type mismatch.

---

## Tech Stack

No new packages required.

| Existing package    | Usage in this task                                           |
| ------------------- | ------------------------------------------------------------ |
| `react-hook-form`   | `useFieldArray` for dynamic sense list in `AddWordModal`     |
| `zod`               | Extended schema with nested sense/grammar/example validation |
| `tailwindcss` (v4)  | Existing `forest-*` palette + `transition` for collapsible   |
| `lucide-react`      | Icons for expand/collapse and tap-to-reveal controls         |

---

## Implementation Details

### Modules / Files

| File                                              | Action | Description                                                                   |
| ------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `frontend/src/types/word.ts`                      | Update | Add `Sense`, `GrammarPattern`, `ExampleSentence` interfaces; extend `Word` and `WordEnrichment` |
| `frontend/src/lib/wordSchema.ts`                  | Update | Add `grammarPatternSchema`, `exampleSentenceSchema`, `senseSchema`; extend `wordSchema` |
| `frontend/src/components/AddWordModal.tsx`        | Update | Add multi-sense dynamic form section with `useFieldArray`; wire enrichment response to sense array |
| `frontend/src/components/EditWordModal.tsx`       | Update | Full edit form: RHF + `useFieldArray`, `useEffect` reset on `word` prop change, PUT submit, Re-enrich, delete |
| `frontend/src/components/WordTable.tsx`           | Update | Display `senses[0]?.meaning_summary ?? ''`; add `onWordUpdated: () => void` prop |
| `frontend/src/lib/api.ts`                         | Update | Add `updateWord(wordId: number, data: WordFormValues): Promise<Word>`           |

---

### Key Functions

```typescript
// frontend/src/types/word.ts

interface GrammarPattern {
  preposition: string | null;  // null = no preposition required
  case: 'Nominativ' | 'Akkusativ' | 'Dativ' | 'Genitiv';
}

interface ExampleSentence {
  german: string;
  english: string;
}

interface Sense {
  meaning_summary: string;
  register: 'Formal' | 'Colloquial' | 'Neutral' | 'Technical';
  grammar_patterns: GrammarPattern[];  // min 1
  example_sentences: ExampleSentence[];  // min 1
}

interface Word {
  id: number;
  word: string;
  translation: string;
  gender?: 'Maskulinum' | 'Femininum' | 'Neutrum';
  category?: string;
  auxiliary_verb?: 'haben' | 'sein';
  principal_forms?: [string, string, string];  // Infinitiv, Präteritum, Partizip II
  senses: Sense[];
}

interface WordEnrichment {
  word: string;
  translation: string;
  gender?: string;
  category?: string;
  auxiliary_verb?: string;
  principal_forms?: string[];
  senses: Sense[];
}
```

```typescript
// frontend/src/lib/wordSchema.ts — extended schema

const grammarPatternSchema = z.object({
  preposition: z.string().nullable(),
  case: z.enum(['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv']),
});

const exampleSentenceSchema = z.object({
  german: z.string().min(1),
  english: z.string().min(1),
});

const senseSchema = z.object({
  meaning_summary: z.string().min(1),
  register: z.enum(['Formal', 'Colloquial', 'Neutral', 'Technical']),
  grammar_patterns: z.array(grammarPatternSchema).min(1),
  example_sentences: z.array(exampleSentenceSchema).min(1),
});

// wordSchema extended — retain existing top-level fields, add:
//   auxiliary_verb?: z.enum(['haben', 'sein']).optional()
//   principal_forms?: z.array(z.string()).length(3).optional()
//   senses: z.array(senseSchema).min(1)
```

```typescript
// frontend/src/components/AddWordModal.tsx — useFieldArray setup

const { fields, append, remove } = useFieldArray({
  control,
  name: 'senses',
});

// On enrich success: call reset({ ...enrichedWord }) to populate the full form
// including the senses array returned by the backend.
// "Add Sense" button calls append({ meaning_summary: '', register: 'Neutral',
//   grammar_patterns: [{ preposition: null, case: 'Akkusativ' }],
//   example_sentences: [{ german: '', english: '' }] })
```

```typescript
// frontend/src/lib/api.ts — new function

export async function updateWord(
  wordId: number,
  payload: WordFormValues
): Promise<Word> {
  const response = await fetch(`http://localhost:8000/words/${wordId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Update failed: ${response.status}`);
  }
  return response.json() as Promise<Word>;
}
```

```typescript
// frontend/src/components/EditWordModal.tsx — key patterns

// 1. Move the isOpen guard AFTER all hook declarations (hooks cannot be conditional)

// 2. Pre-populate form from the word prop
const { control, register, handleSubmit, reset, watch, formState: { errors } } =
  useForm<WordFormValues>({
    resolver: zodResolver(wordSchema),
    defaultValues: buildDefaultValues(word),
  });

// Reset whenever the selected word changes (e.g. user closes and opens a different row)
useEffect(() => { reset(buildDefaultValues(word)); }, [word, reset]);

// 3. Dynamic sense list — same pattern as AddWordModal
const { fields: senseFields, append, remove } = useFieldArray({ control, name: "senses" });

// grammar_patterns and example_sentences use indexed register() paths (no nested useFieldArray)

// 4. Submit flow
const onSubmit = async (data: WordFormValues) => {
  setIsSubmitting(true);
  setSubmitError(null);
  try {
    await updateWord(word.id, data);
    onWordUpdated();  // triggers fetchWords in page.tsx via WordTable
    onClose();        // close only on success — keeps modal open on failure
  } catch (err) {
    setSubmitError(err instanceof Error ? err.message : "Update failed.");
  } finally {
    setIsSubmitting(false);
  }
};

// 5. Re-enrich button (replaces entire form including senses)
const onReEnrich = async () => {
  const enriched = await enrichWord(watch("word"));
  reset({ ...enriched });
};

// 6. Guard: disable "Remove sense" when only one sense remains
<button type="button" onClick={() => remove(index)} disabled={senseFields.length === 1}>
  Remove sense
</button>

// Props addition
interface EditWordModalProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onWordDeleted: () => void;
  onWordUpdated: () => void;  // new — passed from WordTable as the same onRefresh
}
```

---

### Data Models / Schemas

See Key Functions above for the full TypeScript interfaces and Zod schema. The Zod schema is the authoritative runtime contract; the TypeScript interfaces must mirror it exactly.

**Enum alignment with backend:**

| Frontend value  | Backend `CaseEnum`  | Backend `RegisterEnum` |
| --------------- | ------------------- | ---------------------- |
| `'Nominativ'`   | `Nominativ`         | —                      |
| `'Akkusativ'`   | `Akkusativ`         | —                      |
| `'Dativ'`       | `Dativ`             | —                      |
| `'Genitiv'`     | `Genitiv`           | —                      |
| `'Formal'`      | —                   | `Formal`               |
| `'Colloquial'`  | —                   | `Colloquial`           |
| `'Neutral'`     | —                   | `Neutral`              |
| `'Technical'`   | —                   | `Technical`            |

---

### Testing Strategy

No automated frontend tests exist in this project; verification is manual.

**End-to-end flow (golden path):**

```bash
just dev   # starts backend + frontend
```

1. Open `http://localhost:3000`
2. Click "Add Word" → enter a German verb → click "Enrich"
3. Verify the sense array populates (at least 1 sense with grammar patterns and example sentences)
4. Manually add a second sense via "+ Add Sense"; fill required fields
5. Submit → confirm word appears in table with `meaning_summary` of first sense
6. Click the table row → `EditWordModal` opens pre-filled with all fields including senses
7. Edit a sense's `meaning_summary` → save → table refreshes with new value
8. Click the row again → edited data is shown (confirms PUT round-trip)
9. Click "Re-enrich (replaces senses)" → new senses populate the form; save → persisted
10. Delete the word → verify it disappears from the table

**Edge cases:**

- Enrichment returns 0 senses → backend returns HTTP 422; frontend should surface the error message without crashing
- User submits form with 0 senses → Zod validation fires before network call; form shows inline error
- `senses[0]` is undefined (legacy word with empty senses array) → `WordTable` shows empty string, no crash
- `principal_forms` is absent (non-verb) → `EditWordModal` omits the verb morphology section entirely
- Sense card with `preposition: null` → grammar chip renders as "— + Akkusativ" (or similar convention); must not show "null"

**Regression checks:**

- Search still filters the word list after the `translation` column change in `WordTable`
- Theme toggle (dark/light mode) still works across all updated components
- Delete from `EditWordModal` still triggers page refresh via `onWordDeleted`
- AddWordModal submit still works (shared `wordSchema` not broken by changes)
- ESLint: `cd frontend && npm run lint`

---

### Open Questions / Risks

- [x] **`EditWordModal` verb morphology display:** The RFC says `auxiliary_verb` and `principal_forms` live at the `Word` level and should appear in a dedicated "Verb Morphology" section above the sense cards. Decide: always render the section (empty if absent) or conditionally render only when `auxiliary_verb` is set. **Target:** start of implementation. **Answer:** Render only when `auxiliary_verb` is set.
- [x] **Grammar chip format for null preposition:** `GrammarPattern.preposition = null` means "no preposition required." Decide on display convention (e.g., "kein Präposition + Akkusativ" vs "— + Akkusativ") before implementing `EditWordModal` sense cards. **Target:** start of implementation. **Answer:** Use the convention "— + Akkusativ".
- [x] **Sense ordering in `AddWordModal`:** `useFieldArray` preserves insertion order. No drag-to-reorder is planned; confirm this is acceptable for M3. **Target:** start of implementation. **Answer:** It is acceptable.
- [x] **`EditWordModal` sense editing:** The frontend README documents `EditWordModal` as read-only. M3 keeps it read-only (display + delete only). If editing senses is desired, it must be scoped to a separate issue. **Target:** confirm before implementation. **Answer:** Include full editing in M3. `EditWordModal` becomes a complete edit form with RHF, `useFieldArray` for senses, PUT submit, Re-enrich button, and delete. `api.ts` is added to in-scope files.
