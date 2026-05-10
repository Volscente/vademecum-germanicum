# Frontend

## Purpose

A Next.js 16 single-page application that provides the user interface for Vademecum Germanicum, a personal German vocabulary manager. It renders the vocabulary list, handles search, and lets users add or delete words — including an AI-powered enrichment flow that auto-fills word metadata from the backend LLM endpoint.

## Key components

- **`src/app/page.tsx`** — Root page; owns all state (words list, search term, loading flag), fetches from the backend, and passes handlers down to child components
- **`src/components/AddWordModal.tsx`** — Modal form for creating a new word entry; includes an "Enrich" button that calls the AI enrichment API to pre-populate fields
- **`src/components/EditWordModal.tsx`** — Full edit form for updating word data (all fields including nested senses) with a delete action; opened by clicking a row in WordTable
- **`src/components/WordTable.tsx`** — Displays the vocabulary as a clickable table; clicking a row opens EditWordModal
- **`src/components/SearchBar.tsx`** — Debounced search input (300 ms default) that fires an `onSearch` callback when the user pauses typing
- **`src/components/ThemeToggle.tsx`** — Toggles light/dark mode by manipulating the `dark` CSS class on `<html>` and persisting the choice in `localStorage`
- **`src/lib/api.ts`** — HTTP client; exposes `enrichWord` (`POST /words/enrich`) and `updateWord` (`PUT /words/{id}`)
- **`src/lib/wordSchema.ts`** — Zod schemas (`grammarPatternSchema`, `exampleSentenceSchema`, `senseSchema`, `wordSchema`) and derived type (`WordFormValues`) used by both modals for form validation
- **`src/types/word.ts`** — TypeScript interfaces (`Word`, `WordEnrichment`, `Sense`, `GrammarPattern`, `ExampleSentence`) that mirror the FastAPI backend schemas
- **`src/app/globals.css`** — Tailwind v4 theme configuration defining the custom `forest-*` green palette and class-based dark mode

## Public interfaces

- `<AddWordModal onWordAdded>` — button + modal to create a word; calls `onWordAdded()` after a successful save
- `<EditWordModal word isOpen onClose onWordDeleted onWordUpdated>` — full edit form for all word fields including senses; calls `onWordUpdated` after a successful save and `onWordDeleted` after deletion
- `<WordTable words onRefresh>` — renders the vocabulary table; calls `onRefresh()` after a deletion
- `<SearchBar onSearch placeholder? delay?>` — debounced search field; fires `onSearch(value)` after the configured delay
- `<ThemeToggle />` — self-contained dark/light mode toggle; no props
- `enrichWord(word: string): Promise<WordEnrichment>` — calls `POST /words/enrich` and returns AI-generated sense-based word metadata
- `updateWord(wordId: number, data: WordFormValues): Promise<Word>` — calls `PUT /words/{id}` and returns the updated word with full sense graph
- `wordSchema` — Zod schema for word creation/editing form validation (includes nested `senseSchema`, `grammarPatternSchema`, `exampleSentenceSchema`)
- `WordFormValues` — TypeScript type inferred from `wordSchema`
- `Word` — interface matching `WordRead` from the FastAPI backend (includes `senses: Sense[]`)
- `WordEnrichment` — interface matching the enrichment response (includes `senses: Sense[]`)
- `Sense`, `GrammarPattern`, `ExampleSentence` — interfaces for the nested sense graph

## External dependencies

- **next** (v16) — React framework and dev server
- **react** / **react-dom** (v19) — UI library
- **react-hook-form** — Form state management and submission handling
- **zod** — Runtime schema validation
- **@hookform/resolvers** — Connects Zod schemas to react-hook-form
- **tailwindcss** (v4) — Utility-first CSS with custom theme
- **lucide-react** — Icon library (Search, Trash2, Sparkles, etc.)
- **clsx** / **tailwind-merge** — Conditional and conflict-safe class merging

## Constraints / invariants

- The backend base URL is hardcoded to `http://localhost:8000` in both `page.tsx` and `lib/api.ts`; no environment-variable abstraction exists yet.
- Dark mode is initialised by an inline `<script>` in `layout.tsx` that runs before React hydrates, reading `localStorage.theme` and the system `prefers-color-scheme` preference. The `<html>` element has `suppressHydrationWarning` set.
- `wordSchema` is the single source of truth for form validation — both `AddWordModal` and `EditWordModal` must use it; diverging will silently break backend contract alignment. The schema includes nested `senseSchema` with `min_length=1` enforced at the Zod layer.
- Without a search query, the word list is capped at 10 results (`?limit=10`); search results are uncapped.

## Out of scope

- **Authentication / user accounts** — all vocabulary is global and unauthenticated
- **Drag-to-reorder senses** — insertion order is preserved; reordering is not implemented
- **Pagination** — the table shows all search results without paging
- **Backend persistence logic** — handled entirely by the FastAPI backend and PostgreSQL

## Changelog

### 2026-05-10 (v0.3.4)

- Updated `EditWordModal.tsx`: each Sense card is now independently collapsible — click the header to toggle. Collapsed header shows the Meaning Summary (or "No summary yet" when empty) and a red error badge when the Sense has a validation error. Added `sensesCollapsed: boolean[]` state, a `useEffect` that keeps the array in sync with `useFieldArray` `fields` (handles append, remove, and Re-enrich reset), and `toggleSenseCollapsed(index)` handler. Fields remain mounted (CSS-only max-height toggle) so react-hook-form registration and validation are preserved in both states.

### 2026-05-10 (v0.3.3)

- Updated `EditWordModal.tsx`: Verb Morphology card is now collapsible — click the header to toggle; collapsed header shows a real-time principal-forms summary (Infinitiv · Präteritum · Partizip II, or "—" when empty); red error badge appears on the collapsed header when `principal_forms` or `auxiliary_verb` has a validation error; fields remain mounted (CSS-only collapse) so react-hook-form registration is preserved. Added `verbMorphologyCollapsed` state, `useWatch` for `principal_forms`, and `clsx`-driven `max-h` toggle.

### 2026-05-09 (v0.3.2)

- Updated `word.ts`: added `Sense`, `GrammarPattern`, `ExampleSentence` interfaces; extended `Word` with `auxiliary_verb`, `principal_forms`, and `senses`; updated `WordEnrichment` to sense-based shape (removes old flat fields).
- Updated `wordSchema.ts`: added `grammarPatternSchema`, `exampleSentenceSchema`, `senseSchema`; extended `wordSchema` with `auxiliary_verb`, `principal_forms`, and `senses`; removed top-level `example_sentences`.
- Updated `api.ts`: added `updateWord(wordId, data)` for `PUT /words/{id}`; added `Word` import.
- Updated `AddWordModal.tsx`: replaced `example_sentences` textarea with `useFieldArray`-driven senses section; updated `onEnrich` to use `reset()` with the full enriched payload; added optional verb morphology inputs (`auxiliary_verb`, `principal_forms`) shown when `category === "verb"`.
- Rewrote `EditWordModal.tsx` as a full edit form: RHF + `useFieldArray` for senses, `useEffect` reset on `word` prop change, PUT submit via `updateWord`, Re-enrich button, delete retained; added `onWordUpdated` prop.
- Updated `WordTable.tsx`: `Meaning` column now shows `senses[0]?.meaning_summary ?? ''`; added `onWordUpdated` prop to `EditWordModal` (wired as `onRefresh`).
