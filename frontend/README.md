# Frontend

## Purpose

A Next.js 16 single-page application that provides the user interface for Vademecum Germanicum, a personal German vocabulary manager. It renders the vocabulary list, handles search, and lets users add or delete words — including an AI-powered enrichment flow that auto-fills word metadata from the backend LLM endpoint.

## Key components

- **`src/app/page.tsx`** — Root page; owns all state (words list, search term, loading flag), fetches from the backend, and passes handlers down to child components
- **`src/components/AddWordModal.tsx`** — Modal form for creating a new word entry; includes an "Enrich" button that calls the AI enrichment API to pre-populate fields
- **`src/components/EditWordModal.tsx`** — Modal showing word details with a delete action; opened by clicking a row in WordTable
- **`src/components/WordTable.tsx`** — Displays the vocabulary as a clickable table; clicking a row opens EditWordModal
- **`src/components/SearchBar.tsx`** — Debounced search input (300 ms default) that fires an `onSearch` callback when the user pauses typing
- **`src/components/ThemeToggle.tsx`** — Toggles light/dark mode by manipulating the `dark` CSS class on `<html>` and persisting the choice in `localStorage`
- **`src/lib/api.ts`** — HTTP client; currently exposes `enrichWord` for calling `POST /words/enrich`
- **`src/lib/wordSchema.ts`** — Zod schema (`wordSchema`) and derived type (`WordFormValues`) used by AddWordModal for form validation
- **`src/types/word.ts`** — TypeScript interfaces (`Word`, `WordEnrichment`) that mirror the FastAPI backend schemas
- **`src/app/globals.css`** — Tailwind v4 theme configuration defining the custom `forest-*` green palette and class-based dark mode

## Public interfaces

- `<AddWordModal onWordAdded>` — button + modal to create a word; calls `onWordAdded()` after a successful save
- `<EditWordModal word isOpen onClose onWordDeleted>` — read-only word detail panel with a delete action
- `<WordTable words onRefresh>` — renders the vocabulary table; calls `onRefresh()` after a deletion
- `<SearchBar onSearch placeholder? delay?>` — debounced search field; fires `onSearch(value)` after the configured delay
- `<ThemeToggle />` — self-contained dark/light mode toggle; no props
- `enrichWord(word: string): Promise<WordEnrichment>` — calls `POST /words/enrich` and returns AI-generated word metadata
- `wordSchema` — Zod schema for word creation/editing form validation
- `WordFormValues` — TypeScript type inferred from `wordSchema`
- `Word` — interface matching `WordRead` from the FastAPI backend
- `WordEnrichment` — interface matching the enrichment response from the FastAPI backend

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
- Dark mode state is read from `localStorage` only on the client; there is no SSR-safe hydration guard, so a flash-of-wrong-theme is possible on first load.
- `wordSchema` is the single source of truth for form validation — both modals must use it; diverging from it will silently break backend contract alignment.
- Without a search query, the word list is capped at 10 results (`?limit=10`); search results are uncapped.

## Out of scope

- **Authentication / user accounts** — all vocabulary is global and unauthenticated
- **Inline editing of words** — EditWordModal is read-only; editing is not yet implemented
- **Pagination** — the table shows all search results without paging
- **Backend persistence logic** — handled entirely by the FastAPI backend and PostgreSQL
