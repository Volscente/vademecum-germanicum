# #76: Schema & Types

**GitHub Issue:** [#76 — Schema & Types](https://github.com/Volscente/vademecum-germanicum/issues/76)
**GitHub Milestone:** [8-multiple-prepositions](https://github.com/Volscente/vademecum-germanicum/milestone/10)
**Notion page:** [8-Multiple-Prepositions](https://www.notion.so/8-Multiple-Prepositions-3605cc6c0f0780af82dec212d9b61def)

---

## Technical Scope

**In scope:**

- `frontend/src/lib/wordSchema.ts` — confirm `senseSchema.grammar_patterns` is `z.array(grammarPatternSchema).min(1)`
- `frontend/src/types/word.ts` — confirm `GrammarPattern[]` is the typed shape on `Sense` and `WordEnrichment`

**Out of scope:**

- Component code (`AddWordModal.tsx`, `EditWordModal.tsx`) — TASK-2
- Enrichment handler audit — TASK-3
- Backend schemas and models — no changes required

---

## Architecture

```txt
wordSchema.ts
  grammarPatternSchema ──► senseSchema.grammar_patterns: z.array().min(1)
  senseSchema ──────────► wordSchema.senses: z.array().min(1)
  wordSchema ───────────► WordFormValues (z.infer<typeof wordSchema>)
                                   │
                      ┌────────────┴────────────┐
                      ▼                         ▼
              AddWordModal.tsx          EditWordModal.tsx
          useForm<WordFormValues>    useForm<WordFormValues>

word.ts
  GrammarPattern ──► Sense.grammar_patterns: GrammarPattern[]
  Sense ───────────► Word.senses: Sense[]
                     WordEnrichment.senses: Sense[]
```

**Type contract:** `WordFormValues` is inferred from `wordSchema`, so any change to `senseSchema.grammar_patterns` propagates automatically to both modals without manual type maintenance. The `GrammarPattern` interface in `word.ts` provides the runtime-facing type for API responses and enrichment payloads; it must stay aligned with `grammarPatternSchema`.

---

## Tech Stack

No new packages required.

---

## Implementation Details

### Modules / Files

| File | Action | Description |
| ---- | ------ | ----------- |
| `frontend/src/lib/wordSchema.ts` | Confirm | Verify `senseSchema.grammar_patterns` is `z.array(grammarPatternSchema).min(1)`; no changes expected |
| `frontend/src/types/word.ts` | Confirm | Verify `Sense.grammar_patterns` is `GrammarPattern[]` and `WordEnrichment.senses` is `Sense[]`; no changes expected |

---

### Current State (audit findings)

**`frontend/src/lib/wordSchema.ts` (line 17):**

```ts
export const senseSchema = z.object({
  meaning_summary: z.string().min(1, "Meaning summary is required"),
  register: z.enum(["Formal", "Colloquial", "Neutral", "Technical"]),
  grammar_patterns: z.array(grammarPatternSchema).min(1),   // ✓ correct
  example_sentences: z.array(exampleSentenceSchema).min(1),
});
```

`grammarPatternSchema` (lines 4–7):

```ts
export const grammarPatternSchema = z.object({
  preposition: z.string().nullable().optional(),  // nullable AND optional
  case: z.enum(["Nominativ", "Akkusativ", "Dativ", "Genitiv"]),
});
```

**`frontend/src/types/word.ts` (lines 1–5, 19):**

```ts
export interface GrammarPattern {
  id?: number;
  preposition: string | null;   // nullable but not optional
  case: "Nominativ" | "Akkusativ" | "Dativ" | "Genitiv";
}

// inside Sense:
grammar_patterns: GrammarPattern[];  // ✓ list shape correct
```

`WordEnrichment.senses` is `Sense[]` (line 65), which transitively carries `grammar_patterns: GrammarPattern[]`. ✓

---

### Subtle Mismatch to Note

`grammarPatternSchema.preposition` is `z.string().nullable().optional()` — it accepts both `null` and `undefined`. The `GrammarPattern` TypeScript interface declares `preposition: string | null` — it requires explicit `null`, not `undefined`. This has no practical impact (the backend always returns explicit `null` per its contract, and RHF form state initialises missing fields as `undefined`, which passes Zod optional validation). No change is needed, but TASK-2 should initialise new grammar pattern rows with `{ preposition: null, case: "" }` — not `{ preposition: undefined, case: "" }` — to match the backend contract and the TypeScript interface.

---

### Testing Strategy

**Verification (no code changes expected):**

- TypeScript compiler: `cd frontend && npm run lint` — no type errors in `wordSchema.ts` or `word.ts`
- Runtime smoke test: start the app (`just dev`), open Add Word modal, confirm the form accepts and sends `grammar_patterns` as an array

**Edge cases:**

- `grammar_patterns: []` → Zod rejects at form submission (min(1) error surfaced before HTTP request)
- `grammar_patterns: [{ preposition: null, case: "Akkusativ" }]` → valid; backend accepts nullable preposition

---

### Open Questions / Risks

- [ ] **preposition optionality mismatch:** `grammarPatternSchema` allows `undefined` via `.optional()`; `GrammarPattern` interface requires `string | null`. Safe in practice, but TASK-2 must initialise new rows with `null` not `undefined`. **Target:** TASK-2 implementation
- [ ] **No file changes needed:** If the audit confirms both files are already correct (as current state shows), this task closes with no commits. The GitHub issue can be closed with a comment referencing this spec and the audit findings.
