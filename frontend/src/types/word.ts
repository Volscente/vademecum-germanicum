/**
 * This interface matches the 'WordRead' schema from FastAPI backend.
 * It ensures TypeScript knows that every word from the DB has these exact fields.
 */
export interface Word {
  id: number;
  word: string;
  gender?: string;
  translation: string;
  category?: string;
  created_at: string;
}

/**
 * This interface matches the 'WordEnrichment' schema from the FastAPI backend.
 * Returned by POST /words/enrich to pre-fill the word creation form.
 */
export interface WordEnrichment {
  gender: "der" | "die" | "das" | "none";
  word_nominative: string | null;
  word_genitive: string | null;
  word_plural: string | null;
  translation: string;
  category: "noun" | "verb" | "adjective" | "adverb" | "pronoun";
  prepositions: string | null;
  example_sentences: string | null;
  idiomatic_usages: string | null;
}
