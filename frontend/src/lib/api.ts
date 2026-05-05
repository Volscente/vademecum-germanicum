import { WordEnrichment } from "@/types/word";

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
