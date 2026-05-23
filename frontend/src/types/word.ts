export interface GrammarPattern {
  id?: number;
  preposition: string | null;
  case: "Nominativ" | "Akkusativ" | "Dativ" | "Genitiv";
}

export interface ExampleSentence {
  id?: number;
  german: string;
  english: string;
}

export interface Sense {
  id?: number;
  meaning_summary: string;
  register: "Formal" | "Colloquial" | "Neutral" | "Technical";
  difficulty_level?: "Easy" | "Medium" | "Hard" | "VeryHard";
  last_reviewed_at?: string | null;
  grammar_patterns: GrammarPattern[];
  example_sentences: ExampleSentence[];
}

export interface SenseWithWord extends Sense {
  word: string;
  translation: string;
  gender?: string;
  category?: string;
  word_plural?: string | null;
  auxiliary_verb?: string | null;
  principal_forms?: string[] | null;
}

/**
 * This interface matches the 'WordRead' schema from FastAPI backend.
 * It ensures TypeScript knows that every word from the DB has these exact fields.
 */
export interface Word {
  id: number;
  word: string;
  gender?: string;
  word_nominative?: string | null;
  word_genitive?: string | null;
  word_plural?: string | null;
  translation: string;
  category?: string;
  auxiliary_verb?: string | null;
  principal_forms?: string[] | null;
  created_at: string;
  senses: Sense[];
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
  auxiliary_verb: string | null;
  principal_forms: string[] | null;
  senses: Sense[];
}
