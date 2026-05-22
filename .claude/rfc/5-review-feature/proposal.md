---
title: "Word Review Feature"
project: "Vademecum Germanicum"
author: "Simone Porreca"
deadline: "2026-07-31"
notion-page: "https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11"
github-repo: "https://github.com/Volscente/vademecum-germanicum"
milestone: "5-review-feature"
tech-stack:
  - ""
scope-in:
  - "Interface toggle switch between Word Table (Vocabulary Area) and Senses Table (Learning Area)"
  - "Senses Table view aggregating all senses across all words"
  - "Metadata tracking per sense: Difficulty Level, Last Time Reviewed, and 'To Review' badge calculation"
  - "Multi-select functionality for Senses rows to build a 'Review Cart'"
  - "Review Area interface with a sequential, single-card layout ('Sense Card')"
  - "Collapsible sections within the Sense Card (Word Information, Verb Morphology, Sense Information)"
  - "Conditional rendering for Verb Morphology based on word category"
  - "Interactive Difficulty Level buttons (Easy, Medium, Hard, Very Hard) to update sense metadata"
  - "Animated transitions between Sense Cards during a review session"
  - "Review completion screen with navigation routing back to Vocabulary or Learning areas"
scope-out:
  - "Advanced Spaced Repetition Algorithms (SRS): The initial version will use basic time/difficulty calculations for the badge, omitting full SuperMemo-style algorithms for a future phase."
  - "Audio pronunciation playback: Building audio assets or text-to-speech features for the Review Area will be handled in a later initiative."
milestones:
  - "Database schema updates and 'To Review' badge logic implementation"
  - "Learning Area UI: Senses Table development and Review Cart multi-selection"
  - "Review Area UI: Sense Card layout with collapsible sections and conditional verb logic"
  - "Review workflow: Card transitions, difficulty metadata updates, and completion screen routing"
context-paths:
  - ""                  
---

## Problem

The *Vademecum Germanicum* currently operates strictly as a passive Word Database. While users can log words and their respective contextual "Senses," there is no active mechanism to practice, test, or review this information. Without a dedicated learning loop, the system functions as a digital dictionary rather than a comprehensive language-retention tool, limiting its overall value to users trying to actively master German vocabulary.

## Approach direction

We will introduce a dual-mode interface via a high-level view switch. The traditional vocabulary grid will remain in the **Vocabulary Area**, while a new **Learning Area** will flatten the database structure to display all "Senses" rather than top-level words.

From here, users can queue items into a temporary flashcard session via a "Review Cart." The **Review Area** will then process this cart sequentially, utilizing an interactive flashcard UI that dynamically adapts its layout depending on the word's grammatical properties (e.g., displaying auxiliary verbs and principal forms exclusively for verbs).

## Success criteria

- **Interface Navigation:** Introduce a switch button to change the interface between the Word Table (Vocabulary Area) and the Senses Table (Learning Area).
- **Learning Area Framework:** Create the Senses Table within the Learning Area, which displays all Senses across all words rather than individual single Words.
- **Sense Metadata Tracking:** Each Sense in the Learning Area must be associated with three fields:
  1. A Difficulty Level
  2. Last Time Reviewed
  3. Badge "To Review"
- **Algorithmic Badge Triggering:** The "To Review" badge must be dynamically computed based on the specific sense's Difficulty Level and Last Time Reviewed timestamp.
- **Review Cart System:** Enable multi-selection of several Senses rows to automatically add them to a "Review Cart". Provide a "Review Cart" button that routes the user to the Review Area once their desired pile is set.
- **Review Area Engine:** Present the user with a single Sense Card at a time, pulling sequentially from the selection pile.
- **Dynamic Sense Card Layout:** The Sense Card must bundle three core informational structures:
  - **Word Information Section (Collapsible):** Includes word, translation, gender, category, and plural form.
  - **Verb Morphology Section (Collapsible & Conditional):** Includes auxiliary verb and principal forms (*Infinitiv*, *Präteritum*, and *Partizip II*). This section must be hidden entirely if the word is not a verb.
  - **Sense Information Section (Collapsible):** Includes meaning summary, register, grammar patterns, and example sentences.
- **Feedback Loops:** Place 4 distinct Difficulty Level buttons below the Sense Card: **Easy**, **Medium**, **Hard**, and **Very Hard**.
- **State Mutation:** Clicking any Difficulty Level button must instantly update that specific sense's difficulty configuration in the database with the user's choice.
- **Session Progression:** Clicking a Difficulty Level button must transition the current card out and load the next Sense Card in the pile with a smooth visual transition.
- **Review Termination:** Upon clicking the Difficulty Level button of the final card in the queue, render a "Review Completed" completion screen featuring two destination buttons: *Return to Vocabulary Area* and *Return to Learning Area*.

## Constraints

- **Data Continuity:** Modifying fields or ratings inside the Review Area must strictly preserve existing word relationships and context in the main database.
- **UI Responsiveness:** Transitions between cards in the Review Area must feel instantaneous to maintain a rapid flashcard study rhythm.

## Desired tech

*None specified for this initial phase; implementation will leverage the project's existing frontend/backend stack.*

## Integration context

- **Data Model Integration:** This feature must deeply integrate with the existing database schema, specifically attaching the new learning metrics (`difficulty_level`, `last_reviewed_at`) directly onto the existing Senses entity.
- **Routing Integration:** The view state must seamlessly manage transitions between the primary table routes and the temporary, state-isolated Review Area canvas without losing the user's active table filters.

## Known risks / concerns

- **Badge Heuristic Definition:** We need to explicitly define the mathematical rules/time intervals that determine when a combination of `Difficulty Level` and `Last Time Reviewed` triggers the "To Review" badge.
- **Cart State Persistence:** If a user accidentally refreshes their browser or navigates away mid-review, the cart state will be lost unless local storage or backend persistence is engineered for the session queue.
