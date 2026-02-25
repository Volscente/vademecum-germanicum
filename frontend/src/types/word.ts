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
