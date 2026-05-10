# Collapsible UI Components for Word Management — High-Level Planning

**Project:** Vademecum Germanicum
**GitHub repo:** [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)
**GitHub Milestone:** [Milestone: 4-collapsable-cards](https://github.com/Volscente/vademecum-germanicum/milestone/4-collapsable-cards)
**Notion page:** [4-Collapsable Cards](https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375)
**Total estimated effort:** 1.25 FTE-days (1 FTE = 1 day)

---

## Overview

This initiative adds accordion-style collapse behavior to the `EditWordModal` component, which currently forces the user to scroll through all word data (verb morphology and multiple Senses) in one uninterrupted form. Each card receives an independent toggle; collapsed headers display a real-time summary derived from current form state (principal forms for Verb Morphology, Meaning Summary for each Sense). All fields remain mounted in the DOM so react-hook-form validation continues to fire for hidden content.

### Dependency Order

```txt
TASK-1 ──► TASK-2 ──► TASK-3
```

---

## TASK-1 — Collapsible Verb Morphology Card

**GitHub Issue:** #{issue}
**Effort estimate:** 0.5 FTE-days

### Scope

Introduce `verbMorphologyCollapsed: boolean` local state in `EditWordModal.tsx` and wrap the Verb Morphology section in a toggleable card header. Add conditional rendering so the entire card is hidden when `watch('category') !== 'verb'`. Implement the collapsed summary header and the error indicator.

### Goal

The Verb Morphology card can be collapsed to a single-line header showing the three principal forms, and disappears entirely for non-verb words. This task establishes the card-header pattern that TASK-2 reuses for Senses.

### Deliverables

- `frontend/src/components/EditWordModal.tsx` — `verbMorphologyCollapsed` state, card header with `ChevronDown`/`ChevronUp` toggle, CSS collapse (`max-h-0 overflow-hidden transition-[max-height]`), conditional render guard (`category === 'verb'`), real-time summary via `useWatch('principal_forms')`, error badge keyed to `formState.errors.principal_forms`

### Technical Overview

State: `const [verbMorphologyCollapsed, setVerbMorphologyCollapsed] = useState(false)`.

Card header row: `ChevronDown`/`ChevronUp` icon (lucide-react, already available) + card title + summary text + optional red error dot. Summary text = `watch('principal_forms')` values joined as `"Infinitiv, Präteritum, Partizip II"`; fallback `"—"` when any value is empty. Error badge: rendered when `!!formState.errors.principal_forms || !!formState.errors.auxiliary_verb`.

Card body: toggled via `clsx('overflow-hidden transition-[max-height] duration-300', verbMorphologyCollapsed ? 'max-h-0' : 'max-h-[2000px]')`. Fields remain mounted so RHF registration is preserved and validation fires even when collapsed.

Conditional render: wrap the entire card in `{watch('category') === 'verb' && (…)}`.

No changes to `wordSchema.ts`, `api.ts`, or `types/word.ts`.

---

## TASK-2 — Collapsible Sense Cards

**GitHub Issue:** #{issue}
**Effort estimate:** 0.5 FTE-days

### Scope

Introduce `sensesCollapsed: boolean[]` local state in `EditWordModal.tsx`, parallel to the `useFieldArray` `fields` array. Apply the card-header pattern from TASK-1 to each Sense card with independent per-sense toggles. Sync the array with `fields.length` via `useEffect`. Add the error indicator for each Sense card.

### Goal

Each Sense card can be independently collapsed to a single-line header showing its Meaning Summary, and the collapse state stays correct when senses are added, removed, or replaced by Re-enrich.

### Deliverables

- `frontend/src/components/EditWordModal.tsx` — `sensesCollapsed` state, `useEffect` sync with `fields.length`, per-sense card headers with independent toggle, real-time summary via `useWatch` on `senses.N.meaning_summary`, error badges keyed to `formState.errors.senses?.[n]`, CSS collapse on each Sense card body

### Technical Overview

State: `const [sensesCollapsed, setSensesCollapsed] = useState<boolean[]>([])`.

Sync: on every change to `fields.length`, grow the array by pushing `false` for new entries or truncate for removed entries. This handles both append and remove, and Re-enrich's `reset()` call which repopulates `fields` from zero.

Per-sense toggle: update only the entry at index `n`, leaving others unchanged.

Collapsed summary: `watch(`senses.${n}.meaning_summary`)` or `"No summary yet"` fallback.

Error badge: rendered when `!!formState.errors.senses?.[n]`.

Card body collapse: same CSS pattern as TASK-1, indexed on `sensesCollapsed[n]`.

---

## TASK-3 — Global "Collapse All" Button

**GitHub Issue:** #{issue}
**Effort estimate:** 0.25 FTE-days

### Scope

Add a "Collapse All" button to the modal header row in `EditWordModal.tsx` that sets `verbMorphologyCollapsed = true` and all `sensesCollapsed` entries to `true` in a single click. Requires TASK-1 and TASK-2 state to already be in place.

### Goal

Users can condense the entire modal to a summary view with one action, reducing scroll distance when a word has many Senses.

### Deliverables

- `frontend/src/components/EditWordModal.tsx` — "Collapse All" button in the modal header, click handler that bulk-sets both state slices

### Technical Overview

Handler: set `verbMorphologyCollapsed` to `true` and map all entries of `sensesCollapsed` to `true`. Button placed in the modal header row alongside existing controls (Re-enrich, Delete, Close), styled with existing Tailwind utility classes. No new state, no new dependencies.

---

## GitHub Issues

### Milestone 1 — Collapsible Verb Morphology Card

**Tasks:** TASK-1
**Effort:** 0.5 FTE-days

#### Scope

Add collapse/expand behavior and a toggle card header to the Verb Morphology section of `EditWordModal`. Add conditional rendering to hide the card entirely for non-verb words.

#### Goal

The Verb Morphology card shows a one-line principal-forms summary when collapsed and disappears for non-verb entries. The card-header pattern is validated and ready to be applied to Senses.

#### Deliverables

- `verbMorphologyCollapsed` state and toggle handler in `EditWordModal.tsx`
- Card header with ChevronDown/ChevronUp, principal-forms summary text, and error badge
- CSS max-height collapse on the card body (fields remain mounted)
- Conditional render guard (`category === 'verb'`)

---

### Milestone 2 — Collapsible Sense Cards

**Tasks:** TASK-2
**Effort:** 0.5 FTE-days

#### Scope

Apply the card-header pattern from Milestone 1 to every Sense card, with independent per-sense collapse state managed as a `boolean[]` synced to `useFieldArray`.

#### Goal

Each Sense card collapses independently to a one-line Meaning Summary header. The state array stays correct across append, remove, and Re-enrich operations.

#### Deliverables

- `sensesCollapsed: boolean[]` state and per-sense toggle handler in `EditWordModal.tsx`
- `useEffect` sync with `fields.length` (handles append, remove, Re-enrich reset)
- Per-sense card headers with Meaning Summary text and error badges
- CSS max-height collapse on each Sense card body

---

### Milestone 3 — Global "Collapse All" Button

**Tasks:** TASK-3
**Effort:** 0.25 FTE-days

#### Scope

Add a "Collapse All" button to the modal header that bulk-collapses every collapsible card (Verb Morphology + all Senses) in a single action.

#### Goal

Users can reduce the entire modal to a compact summary view with one click, making the form manageable when a word has multiple Senses.

#### Deliverables

- "Collapse All" button in the `EditWordModal` header row
- Click handler setting `verbMorphologyCollapsed = true` and all `sensesCollapsed` entries to `true`
