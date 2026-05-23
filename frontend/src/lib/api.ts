import { Sense, SenseWithWord, Word, WordEnrichment } from "@/types/word";
import { WordFormValues } from "@/lib/wordSchema";

/**
 * Call POST /words/enrich and return the enriched word metadata.
 *
 * @param word - The German word string to enrich.
 * @returns A WordEnrichment object with LLM-populated fields.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function enrichWord(word: string): Promise<WordEnrichment> {
  const response = await fetch("http://localhost:8000/words/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
  });

  if (!response.ok) {
    throw new Error(`Enrichment failed: ${response.status}`);
  }

  return response.json() as Promise<WordEnrichment>;
}

/**
 * Fetch all senses with their parent word fields from GET /senses/.
 *
 * @returns Array of SenseWithWord objects.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function getSenses(): Promise<SenseWithWord[]> {
  const response = await fetch("http://localhost:8000/senses/");

  if (!response.ok) {
    throw new Error(`Failed to fetch senses: ${response.status}`);
  }

  return response.json() as Promise<SenseWithWord[]>;
}

/**
 * Send a difficulty rating for a sense via PUT /senses/{senseId}/review.
 *
 * Fire-and-forget from the UX perspective: the UI advances the card
 * immediately without waiting for the response.
 *
 * @param senseId - The ID of the sense to update.
 * @param difficultyLevel - One of "Easy" | "Medium" | "Hard" | "VeryHard".
 * @returns The updated Sense object returned by the backend.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function updateSenseReview(
  senseId: number,
  difficultyLevel: string,
): Promise<Sense> {
  const response = await fetch(
    `http://localhost:8000/senses/${senseId}/review`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty_level: difficultyLevel }),
    },
  );

  if (!response.ok) {
    throw new Error(`Review update failed: ${response.status}`);
  }

  return response.json() as Promise<Sense>;
}

/**
 * Call PUT /words/{wordId} and return the updated word.
 *
 * @param wordId - The ID of the word to update.
 * @param payload - The updated word data conforming to WordFormValues.
 * @returns The updated Word object with the full sense graph.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function updateWord(
  wordId: number,
  payload: WordFormValues,
): Promise<Word> {
  const response = await fetch(`http://localhost:8000/words/${wordId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ??
        `Update failed: ${response.status}`,
    );
  }

  return response.json() as Promise<Word>;
}
