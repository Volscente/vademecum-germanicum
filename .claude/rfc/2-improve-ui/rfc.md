# [RFC] Improve UI — Vademecum Germanicum

| Author          | Simone Porreca                                                                          |
| :-------------- | :-------------------------------------------------------------------------------------- |
| **Project**     | Vademecum Germanicum                                                                    |
| **RFC status**  | Draft                                                                                   |
| **Review deadline** | 2026-05-10                                                                          |
| **Notion page** | [2 — Improve UI](https://www.notion.so/2-Improve-UI-3575cc6c0f078023834df02a2390b410) |
| **GitHub repo** | [Volscente/vademecum-germanicum](https://github.com/Volscente/vademecum-germanicum)    |
| **Milestone**   | [Milestone: Improve UI](https://github.com/Volscente/vademecum-germanicum/milestone/4) |

### Timeline

| Date       | Status | Note  |
| :--------- | :----- | :---- |
| 2026-05-07 | Draft  |       |

### Table of contents

[Motivation](#motivation)

[Objectives](#objectives)

[Scope](#scope)

[UI Improvement Design](#ui-improvement-design)

[Tech Stack](#tech-stack)

[Effort Estimations](#effort-estimations)

[FAQs](#faqs)

[Risks & Open Questions](#risks--open-questions)

[References](#references)

---

## Motivation {#motivation}

The current UI of Vademecum Germanicum is functional but visually rough: the green palette is used inconsistently across light and dark modes, dark mode in particular produces an overly bright, saturated green that is hard on the eye, and the overall component layout lacks the clean, structured feel of a polished productivity tool. The goal of this initiative is to refine the visual presentation — tightening spacing, muting the dark-mode palette, and adding a logo — without altering any feature behaviour or departing from the forest-green identity. For full context, see the [Notion initiative page](https://www.notion.so/2-Improve-UI-3575cc6c0f078023834df02a2390b410).

## Objectives {#objectives}

- **Refine dark-mode palette**: Replace the current bright neon greens in dark mode with deeper, less saturated `forest-*` variants so the UI is comfortable to use at night.
- **Clean up component layout**: Reduce visual noise across all components (WordTable, modals, SearchBar, header) by tightening padding, standardising border radius, and removing unnecessary decorative elements.
- **Add an app logo**: Introduce a simple logo in the header that reinforces the identity of the app without adding external asset dependencies.
- **Preserve all existing usability**: Every existing user action — adding a word, enriching a word, searching, deleting, toggling theme — must remain fully functional after the visual refresh.
- **Eliminate the dark-mode flash on load**: Fix the flash-of-wrong-theme caused by the current localStorage-only hydration approach, since the dark-mode work makes this defect more visible.

## Scope {#scope}

**In-Scope:**

- Refactor UI — visual and layout changes across all frontend components

**Constraints:**

The forest-green colour must remain the central identity of the app. Only calibration of saturation/brightness is permitted in dark mode; the hue family must not change. No backend changes are allowed as part of this initiative.

---

# **UI Improvement Design** {#ui-improvement-design}

## Approach Overview {#approach-overview}

The entire scope of this RFC is confined to `frontend/`. The central theming file is `src/app/globals.css`, which defines the custom `forest-*` Tailwind v4 palette and the `class`-based dark mode strategy. The approach is to make targeted changes in two layers: first the colour system, then the components that consume it.

**Layer 1 — Palette calibration.** The `forest-*` scale in `globals.css` will be adjusted so that dark-mode surfaces use deeper, lower-saturation greens (e.g. shifting accent tokens toward `forest-800`/`forest-900` rather than `forest-400`/`forest-500`). Light-mode values are left mostly unchanged to honour the constraint that the colour palette remains the same. A flash-of-wrong-theme inline script will be added to `<head>` in `layout.tsx` to apply the `dark` CSS class before React hydrates, removing the flicker that would become more noticeable after the palette shift.

**Layer 2 — Component visual refresh.** Each component receives a layout pass: consistent border radius (`rounded-md`), tighter and more uniform padding, clean separator lines in the table, and muted backgrounds for modals. The aesthetic target is macOS/Linux-style — crisp, minimal, no gradients or heavy shadows. A logo will be added to the app header using either a simple SVG inline element or a `lucide-react` icon paired with the app name in a styled `<span>`, keeping external asset dependencies at zero.

The author's stated approach direction (keep green, mute dark mode, clean/lean style, add logo) is adopted in full. The one extension is the dark-mode flash fix: it is a prerequisite for the palette work to be perceived correctly on first load, and it is localised to `layout.tsx`, so it does not expand the scope meaningfully.

## M1 — Palette & Dark Mode {#m1-palette--dark-mode}

Update the `forest-*` token values in `globals.css` so dark-mode variants use the deeper end of the scale. Identify every component using bright green dark-mode classes (`dark:text-forest-400`, `dark:bg-forest-300`, etc.) and remap them to the adjusted tokens. Add a small inline `<script>` to `layout.tsx` that reads `localStorage.theme` and sets `document.documentElement.classList` before the page is painted, eliminating the hydration flash. Verify by toggling theme with browser devtools throttled to 3G to make the flash visible if it still occurs.

## M2 — Component Refresh & Logo {#m2-component-refresh--logo}

Apply the layout pass to all components in sequence: `WordTable` (row padding, header weight, border colour), `AddWordModal` / `EditWordModal` (modal container border radius, field spacing, button hierarchy), `SearchBar` (input border and focus ring style), and the top-level header in `page.tsx`. Add the logo — either a small inline SVG leaf/book icon or a `lucide-react` icon — alongside the app name in the header. Run `npm run lint` and confirm all existing user flows work end-to-end in both light and dark mode before closing the milestone.

## Tech Stack {#tech-stack}

- **Tailwind CSS v4**: The existing theming mechanism; the `forest-*` palette and `dark:` variants in `globals.css` are the single point of change for colour calibration.
- **lucide-react**: Already a dependency; sufficient for an icon-based logo without adding a new asset pipeline.
- **clsx / tailwind-merge**: Already in use across components for conditional class merging; the layout pass will continue to rely on these for dark-mode class composition.

## Effort Estimations {#effort-estimations}

Total estimated effort: **3 sessions**.

| Milestone                     | Description                                                              | Est. effort | GitHub Issue |
| :---------------------------- | :----------------------------------------------------------------------- | :---------- | :----------- |
| M1 — Palette & Dark Mode      | Remap dark-mode tokens in globals.css, fix hydration flash in layout.tsx | 1 session   | #{issue}     |
| M2 — Component Refresh & Logo | Layout pass on all components, add logo to header                        | 2 sessions  | #{issue}     |

### Recommended Order

1. M1 — Palette & Dark Mode (establishes the token foundation that M2 components will consume)
2. M2 — Component Refresh & Logo (depends on stable palette tokens from M1)

---

# **FAQs** {#faqs}

**Q: Why fix the dark-mode flash as part of this RFC rather than a separate issue?**

A: The flash is only clearly perceptible once the dark-mode palette is less saturated — the current bright green flash is less jarring. Fixing it now is a one-file change in `layout.tsx` and avoids reopening the same area after M1 ships.

**Q: Why not introduce a design system library (e.g. shadcn/ui or Radix) for the component refresh?**

A: The scope is a visual refinement, not a component architecture change. Introducing a UI library would bring a large dependency, require migrating all existing components, and risk breaking the validated Zod/react-hook-form integration. Tailwind v4 with the existing `clsx`/`tailwind-merge` setup is sufficient to reach the target aesthetic.

**Q: What does "macOS/Linux style" mean concretely for this codebase?**

A: In Tailwind terms: `rounded-md` (not sharp, not pill-shaped), `border border-forest-200 dark:border-forest-700` separators, `shadow-sm` or no shadow on modals, monospace or system-ui font stack for data cells, and no gradients on interactive elements.

**Q: Will the logo require a new image asset or build step?**

A: No. The logo will be either an inline SVG (a few lines, no file dependency) or a `lucide-react` icon already in the dependency graph. No `<Image>` component, no `/public` asset, no CDN.

**Q: Terminology?**

A: No acronyms introduced in this RFC. Key terms:
- **forest-\*** — the custom Tailwind colour scale defined in `src/app/globals.css`
- **FOWT** — flash of wrong theme: the brief moment on first load where the page renders in the wrong colour scheme before JavaScript reads `localStorage`

---

## Risks & Open Questions {#risks--open-questions}

| Risk / Question                                                                                              | Likelihood | Mitigation / Answer                                                                                                          |
| :----------------------------------------------------------------------------------------------------------- | :--------- | :--------------------------------------------------------------------------------------------------------------------------- |
| Palette changes in globals.css affect light mode if token remapping is not scoped to dark variants           | Low        | Audit every changed token with both modes active before committing; keep a before/after screenshot in the PR.                |
| "Clean and lean" is subjective — review may require multiple visual iterations                               | Medium     | Agree on a reference screenshot before M2 begins; use it as the acceptance criterion rather than prose description.          |
| Inline `<script>` for FOWT fix may conflict with Next.js 16 App Router hydration or streaming                | Low        | Keep the script minimal (read localStorage, set class); no React state involved. Test with `next build && next start`.       |

## References {#references}

- [Notion initiative page](https://www.notion.so/2-Improve-UI-3575cc6c0f078023834df02a2390b410)
- [GitHub Milestone](https://github.com/Volscente/vademecum-germanicum/milestone/4)
- [Tailwind CSS v4 theming docs](https://tailwindcss.com/docs/theme)
- [Next.js App Router — layout file](https://nextjs.org/docs/app/api-reference/file-conventions/layout)
