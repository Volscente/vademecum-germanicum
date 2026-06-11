---
title: "Collapsible UI Components for Word Management"
project: "Vademecum Germanicum"
author: "Simone Porreca"
deadline: "2026-05-12"
notion-page: "https://www.notion.so/4-Collapsable-Cards-35c5cc6c0f0780fcaf30f0929b928375"
github-repo: "https://github.com/Volscente/vademecum-germanicum"
milestone: "4-collapsable-cards"
tech-stack:
  - ""
scope-in:
  - "Interactive toggle functionality for 'Verb Morphology' card"
  - "Independent toggle functionality for each 'Sense X' card"
  - "Summary view logic for collapsed Verb Morphology (Infinitiv, Präteritum, Partizip II)"
  - "Summary view logic for collapsed Senses (Meaning Summary)"
  - "Conditional rendering to hide the Verb Morphology card if no data is present"
  - "Global 'Collapse All' button for every card" 
scope-out:
  - "Drag-and-drop reordering of senses: out of scope"
milestones:
  - ""
context-paths:
  - "frontend/README.md"
---

## Problem

The current 'Edit Word' form suffers from significant information overload. The modal is vertically long, requiring extensive scrolling to navigate between the basic word details and the various meanings (Senses). This makes it difficult for users to quickly scan the data or find specific sections without being distracted by secondary grammatical details.

## Approach direction

Introduce an 'Accordion-style' behavior for the major data sections. By default, sections should likely remain expanded or remember their state, but provide a one-click toggle to condense the cards into a single-line summary.

For the 'Verb Morphology' card, the collapsed header should dynamically pull the three principal forms to remain useful even when closed. Similarly, each 'Sense' should display its 'Meaning Summary' in the header when collapsed, allowing the user to see an overview of all definitions at a glance.

## Success criteria

- **One-Click Interaction:** Users can expand/collapse cards with a single click on the header or a designated toggle icon.
- **Morphology Summary:** When the 'Verb Morphology' card is collapsed, it must display the values of the Infinitiv, Präteritum, and Partizip II fields (e.g., "abdrehen, drehte ab, abgedreht").
- **Conditional Visibility:** If a word is not a verb (and thus has no morphology data), the card 'Verb Morphology' should not be rendered at all.
- **Independent Senses:** Each "Sense X" card operates independently; collapsing one does not affect the others.
- **Sense Summary:** A collapsed "Sense X" card must display the text from its respective "Meaning Summary" field in the header.

## Constraints

- The collapsed state must not hide critical identification info (Meaning Summary/Principal Forms).
- The implementation must handle multiple Senses (Sense 1, Sense 2, etc.) dynamically.

## Desired tech

- State management (local component state or a store) to track the `isCollapsed` boolean for each section.
- Framer Motion or standard CSS transitions for smooth height animations during expansion/collapse.

## Integration context

- Must integrate into the existing `Edit Word` modal/form component.
- The collapsed summary values must update in real-time if the user edits the fields while the card is expanded.

## Known risks / concerns

- **Empty Fields:** If a user collapses a card before filling in the 'Meaning Summary' or 'Principal Forms', the collapsed header might look empty or broken. We may need placeholder text (e.g., "No summary provided").
- **Form Validation:** Ensure that hidden/collapsed fields still trigger validation errors if the user attempts to save.
