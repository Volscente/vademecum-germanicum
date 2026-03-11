// Runtime Validation
import { z } from "zod";

export const wordSchema = z.object({
  word: z.string().min(1, "German word is required"),
  translation: z.string().min(1, "Translation is required"),
  gender: z.enum(["der", "die", "das", "none"]),
  category: z.enum([
    "noun",
    "verb",
    "adjective",
    "adverb",
    "preposition",
    "other",
  ]),
  word_plural: z.string().optional(),
  example_sentences: z.string().optional(),
});

// Generate a TypeScript Type Interface to be used in AddWordModal.tsx
export type WordFormValues = z.infer<typeof wordSchema>;
