// Runtime Validation
import { z } from "zod";

export const grammarPatternSchema = z.object({
  preposition: z.string().nullable().optional(),
  case: z.enum(["Nominativ", "Akkusativ", "Dativ", "Genitiv"]),
});

export const exampleSentenceSchema = z.object({
  german: z.string().min(1, "German sentence is required"),
  english: z.string().min(1, "English translation is required"),
});

export const senseSchema = z.object({
  meaning_summary: z.string().min(1, "Meaning summary is required"),
  register: z.enum(["Formal", "Colloquial", "Neutral", "Technical"]),
  grammar_patterns: z.array(grammarPatternSchema).min(1),
  example_sentences: z.array(exampleSentenceSchema).min(1),
});

export const wordSchema = z.object({
  word: z.string().min(1, "German word is required"),
  translation: z.string().min(1, "Translation is required"),
  gender: z.enum(["der", "die", "das", "none"]),
  category: z.enum(["noun", "verb", "adjective", "adverb", "pronoun"]),
  word_plural: z.string().optional(),
  auxiliary_verb: z.string().optional(),
  principal_forms: z.array(z.string()).optional(),
  senses: z.array(senseSchema).min(1, "At least one sense is required"),
});

// Generate a TypeScript Type Interface to be used in AddWordModal.tsx and EditWordModal.tsx
export type WordFormValues = z.infer<typeof wordSchema>;
