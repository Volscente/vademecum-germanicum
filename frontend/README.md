# Frontend

## Purpose

A Next.js 16 single-page application that provides the user interface for Vademecum Germanicum, a personal German vocabulary manager. It renders the vocabulary list, handles search, and lets users add or delete words — including an AI-powered enrichment flow that auto-fills word metadata from the backend LLM endpoint.

## Key components

- **`src/app/page.tsx`** — Root page; owns all state (words list, search term, loading flag, active area, review queue), fetches from the backend, and passes handlers down to child components
- **`src/components/AreaToggle.tsx`** — Pill-style toggle switch between the Vocabulary Area and the Learning Area; hidden when the Review Area is active
- **`src/components/SensesTable.tsx`** — Senses table for the Learning Area; fetches all senses via `getSenses()`, renders per-row To Review badges via `toReview()`, maintains local multi-select state, and fires `onStartReview` with the selected senses
- **`src/components/ReviewArea.tsx`** — Full-canvas review session container; owns `currentIndex` and `isTransitioning` state; fires `updateSenseReview` on difficulty selection then advances the card with a 150 ms opacity + `translate-x` CSS transition; renders `ReviewCompleteScreen` when the queue is exhausted; shows an empty-queue fallback
- **`src/components/ReviewCompleteScreen.tsx`** — Session-end screen rendered when all cards in the review queue have been rated; two buttons to navigate back to the Vocabulary Area or Learning Area via `onNavigate`
- **`src/components/SenseCard.tsx`** — Flashcard display for a single sense; three collapsible sections (Word Information, Verb Morphology, Sense Information); Verb Morphology rendered only when `category === "verb"`; four Difficulty Level buttons (Easy / Medium / Hard / Very Hard)
- **`src/components/AddWordModal.tsx`** — Modal form for creating a new word entry; includes an "Enrich" button that calls the AI enrichment API to pre-populate fields
- **`src/components/EditWordModal.tsx`** — Full edit form for updating word data (all fields including nested senses) with a delete action; opened by clicking a row in WordTable
- **`src/components/WordTable.tsx`** — Displays the vocabulary as a clickable table; clicking a row opens EditWordModal
- **`src/components/SearchBar.tsx`** — Debounced search input (300 ms default) that fires an `onSearch` callback when the user pauses typing
- **`src/components/ThemeToggle.tsx`** — Toggles light/dark mode by manipulating the `dark` CSS class on `<html>` and persisting the choice in `localStorage`
- **`src/lib/api.ts`** — HTTP client; exposes `enrichWord`, `updateWord`, `getSenses`, and `updateSenseReview`
- **`src/lib/wordSchema.ts`** — Zod schemas (`grammarPatternSchema`, `exampleSentenceSchema`, `senseSchema`, `wordSchema`) and derived type (`WordFormValues`) used by both modals for form validation
- **`src/lib/reviewUtils.ts`** — `REVIEW_THRESHOLDS` constant and `toReview(sense)` utility for computing the "To Review" badge
- **`src/types/word.ts`** — TypeScript interfaces (`Word`, `WordEnrichment`, `Sense`, `SenseWithWord`, `GrammarPattern`, `ExampleSentence`) that mirror the FastAPI backend schemas
- **`src/app/globals.css`** — Tailwind v4 theme configuration defining the custom `forest-*` green palette and class-based dark mode

## Public interfaces

- `<ReviewArea reviewQueue onNavigate>` — review session container; `reviewQueue: SenseWithWord[]`, `onNavigate: (area: "vocabulary" | "learning") => void`; manages card progression and transition animation internally
- `<ReviewCompleteScreen onNavigate>` — completion screen; `onNavigate: (area: "vocabulary" | "learning") => void`; rendered by `ReviewArea` after the last card is rated
- `<SenseCard sense onDifficultySelect>` — sense flashcard; `onDifficultySelect: (level: "Easy" | "Medium" | "Hard" | "VeryHard") => void`
- `<AreaToggle area onAreaChange>` — pill toggle between `"vocabulary"` and `"learning"`; not rendered when `area === "review"`
- `<SensesTable onStartReview>` — senses table with multi-select checkboxes and "Start Review" button; calls `onStartReview(selected: SenseWithWord[])` to hand off the review queue
- `<AddWordModal onWordAdded>` — button + modal to create a word; calls `onWordAdded()` after a successful save
- `<EditWordModal word isOpen onClose onWordDeleted onWordUpdated>` — full edit form for all word fields including senses; calls `onWordUpdated` after a successful save and `onWordDeleted` after deletion
- `<WordTable words onRefresh>` — renders the vocabulary table; calls `onRefresh()` after a deletion
- `<SearchBar onSearch placeholder? delay?>` — debounced search field; fires `onSearch(value)` after the configured delay
- `<ThemeToggle />` — self-contained dark/light mode toggle; no props
- `enrichWord(word: string): Promise<WordEnrichment>` — calls `POST /words/enrich` and returns AI-generated sense-based word metadata
- `updateWord(wordId: number, data: WordFormValues): Promise<Word>` — calls `PUT /words/{id}` and returns the updated word with full sense graph
- `getSenses(): Promise<SenseWithWord[]>` — calls `GET /senses/` and returns all senses with parent word fields embedded
- `updateSenseReview(senseId, difficultyLevel): Promise<Sense>` — calls `PUT /senses/{id}/review` to persist a difficulty rating and stamp `last_reviewed_at`
- `toReview(sense: SenseWithWord): boolean` — returns `true` if the sense is due for review based on `REVIEW_THRESHOLDS` and `last_reviewed_at`
- `wordSchema` — Zod schema for word creation/editing form validation (includes nested `senseSchema`, `grammarPatternSchema`, `exampleSentenceSchema`)
- `WordFormValues` — TypeScript type inferred from `wordSchema`
- `Word` — interface matching `WordRead` from the FastAPI backend (includes `senses: Sense[]`)
- `WordEnrichment` — interface matching the enrichment response (includes `senses: Sense[]`)
- `Sense`, `SenseWithWord`, `GrammarPattern`, `ExampleSentence` — interfaces for the nested sense graph and the review-enriched sense shape; `SenseWithWord` includes `word_plural`, `auxiliary_verb`, `principal_forms` from the parent word

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

### 2026-05-23 (v0.4.3)

- Added `ReviewCompleteScreen.tsx`: session-end screen with "Return to Vocabulary Area" and "Return to Learning Area" buttons wired to `onNavigate`.
- Updated `ReviewArea.tsx`: added `currentIndex` and `isTransitioning` state; wired `onDifficultySelect` to `updateSenseReview` (fire-and-forget) + 150 ms opacity/`translate-x` transition; progress counter now reflects `currentIndex + 1`; renders `ReviewCompleteScreen` when `currentIndex >= reviewQueue.length`; `onNavigate` is now destructured and used.

### 2026-05-23 (v0.4.2)

- Added `ReviewArea.tsx`: full-canvas review session container rendering `SenseCard` for the first queue item; "1 / N senses" read-only progress counter; empty-queue fallback.
- Added `SenseCard.tsx`: three collapsible sections (Word Information, Verb Morphology, Sense Information) with `max-h` CSS toggle and `overflow-y-auto`; Verb Morphology omitted entirely when `category !== "verb"`; four Difficulty Level buttons using `ThumbsUp` / `Minus` / `TrendingDown` / `ThumbsDown` lucide-react icons.
- Updated `word.ts`: added `word_plural`, `auxiliary_verb`, `principal_forms` optional fields to `SenseWithWord`.
- Updated `page.tsx`: replaced `area === "review"` placeholder with `<ReviewArea …/>`; added `ReviewArea` import.

### 2026-05-23 (v0.4.1)

- Added `AreaToggle.tsx`: pill-style toggle switching between Vocabulary and Learning areas, styled with the `forest-*` palette.
- Added `SensesTable.tsx`: Learning Area table fetching all senses via `getSenses()`, computing To Review badges via `toReview()`, managing local multi-select state, and triggering review sessions via `onStartReview`.
- Updated `page.tsx`: added `area` (`"vocabulary" | "learning" | "review"`) and `reviewQueue` state; `SearchBar` now renders only in Vocabulary Area; `AreaToggle` renders above the content pane (hidden in Review Area); content pane conditionally renders `WordTable`, `SensesTable`, or a Review Area placeholder.

### 2026-05-23 (v0.4.0)

- Updated `word.ts`: extended `Sense` with optional `difficulty_level` and `last_reviewed_at` fields; added `SenseWithWord` interface embedding parent word fields (`word`, `translation`, `gender`, `category`).
- Added `reviewUtils.ts`: `REVIEW_THRESHOLDS` constant (`Easy: 7d`, `Medium: 3d`, `Hard: 1d`, `VeryHard: 0d`) and `toReview(sense)` utility.
- Updated `api.ts`: added `getSenses()` (`GET /senses/`) and `updateSenseReview(senseId, difficultyLevel)` (`PUT /senses/{id}/review`).

### 2026-05-10 (v0.3.5)

- Updated `EditWordModal.tsx`: added a "Collapse All" button just above the Verb Morphology card. Clicking it sets `verbMorphologyCollapsed = true` and maps all `sensesCollapsed` entries to `true` via a `handleCollapseAll` handler, condensing the entire modal to summary headers in one action.

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
