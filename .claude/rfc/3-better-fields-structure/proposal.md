---
title: "Enhanced Linguistic Context & Usage Fields"
project: "Vademecum Germanicum"
author: "Simone Porreca"
deadline: "2026-05-17"
notion-page: "https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc"
github-repo: "https://github.com/Volscente/vademecum-germanicum"
milestone: "3-better-fields-structure"
tech-stack:
  - ""
scope-in:
  - "Multi-sense word categorization"
  - "Contextual example sentences with translations"
  - "Grammatical governance (Prepositions & Cases)"
  - "Social register/tone tagging"
  - "Morphological inflection data (Verbs/Nouns/Conjugation)"
scope-out:
  - "Lexical relationships: Synonyms and antonyms are deferred to a later phase."
  - "Audio generation: Voice synthesis is out of scope for this RFC."
milestones:
  - ""
context-paths:
  - "backend/README.md"
  - "frontend/README.md"
---

## Problem

The current data model is restricted to literal translations, which fails to teach learners how to actually use German words in conversation. Users lack information on which prepositions to use, which grammatical cases are triggered, and how a word's meaning shifts across different contexts (e.g., "abdrehen"). This "dictionary-style" approach leads to grammatically incorrect sentence construction and a lack of nuance in the learner's vocabulary.

## Approach direction

Transition the data architecture from a "Flat Word Model" to a "Sense-Based Model." Each word will act as a parent container for one or more "Senses." Each Sense will independently house its own definition, specific prepositional requirements, tone indicators, and a curated set of example sentences. This ensures that grammatical rules (like Akkusativ vs. Dativ) are tied to specific meanings rather than the word as a whole.

## Success criteria

- **Sense-Based Categorization:** Every word entry must group definitions, examples, and grammar rules into distinct "Senses" to ensure learners understand the specific usage of a word's different meanings.
- **Contextual Example Sets:** Each word sense must provide at least three German example sentences with human-verified translations and context labels to demonstrate real-world application.
- **Explicit Grammatical Governance:** All entries must specify the required preposition and its associated grammatical case, or explicitly state "no preposition required," to ensure correct sentence construction.
- **Register and Tone Labeling:** Every word sense must be tagged with its social register (e.g., "Colloquial," "Formal") to guide the learner in choosing appropriate vocabulary.
- **Morphological Verb DNA:** Every verb entry must display its auxiliary verb (haben/sein) and its three principal forms (Infinitive, Präteritum, Partizip II) to facilitate correct tense construction.

## Constraints

- **Mobile Real Estate:** The UI must remain clean; "heavy" data like example translations should be hidden behind interactions (e.g., tap-to-reveal) to prevent cognitive overload.
- **Data Integrity:** No word sense can be published without meeting the minimum requirement of one example sentence and a designated grammatical case.

## Desired tech

- **"Quick Data" Signposting:** Collapsed UI cards must display high-priority "signpost" data—including the primary meaning summary, register tags, and mandatory preposition/case triggers—to provide immediate value without expansion.
- **Progressive Disclosure UI:** Implementation of "Expandable Cards" for Senses and "Tap-to-Reveal" for translations to encourage active recall and keep the interface decluttered.
- **Nested Grammar Pattern Arrays:** The data schema must support a one-to-many relationship between a "Sense" and its "Prepositions," allowing multiple grammatical patterns (Preposition + Case) to be rendered within a single meaning block.

## Integration context

- **API Extension:** The existing word retrieval endpoint must be updated to return an array of "Sense" objects instead of a single string-based translation.
- **Frontend Refactor:** The "Word Detail" view in the mobile app must be redesigned to accommodate the hierarchical structure of Senses, Prepositions, and Examples.
- **Data Model:** The current Word data model must be update with the new Word Structure
- **Word Enrichment:** The existing word enrichment endpoint must be updated to return the new Word Structure

## Known risks / concerns

- **UI Complexity:** Transitioning from a simple 5-field card to a multi-sense detailed view might overwhelm beginner (A1) users if not handled with progressive disclosure.
