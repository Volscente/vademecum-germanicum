import { Sense, SenseWithWord, Word, WordEnrichment } from "@/types/word";
import { WordFormValues } from "@/lib/wordSchema";
import { Resource, Topic } from "@/types/resource";
import { ResourceFormValues, TopicFormValues } from "@/lib/resourceSchema";
import { apiFetch } from "@/lib/apiClient";

/**
 * Call POST /words/enrich and return the enriched word metadata.
 *
 * @param word - The German word string to enrich.
 * @returns A WordEnrichment object with LLM-populated fields.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function enrichWord(word: string): Promise<WordEnrichment> {
  const response = await apiFetch("/words/enrich", {
    method: "POST",
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
  const response = await apiFetch("/senses/");

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
  const response = await apiFetch(`/senses/${senseId}/review`, {
    method: "PUT",
    body: JSON.stringify({ difficulty_level: difficultyLevel }),
  });

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
  const response = await apiFetch(`/words/${wordId}`, {
    method: "PUT",
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

/**
 * Check whether a word already exists in the vocabulary table.
 *
 * Calls GET /words/?search=<word>&limit=500 and filters the response for a
 * case-insensitive exact match on the `word` field. The search endpoint does
 * substring matching, so client-side filtering is required to avoid false
 * positives (e.g. "laufen" matching "anlaufen").
 *
 * @param word - The word string to check, as typed by the user.
 * @returns Promise resolving to true if an exact (case-insensitive) match
 *          exists, false otherwise.
 */
export async function checkWordExists(word: string): Promise<boolean> {
  if (!word) {
    return false;
  }

  const response = await apiFetch(
    `/words/?search=${encodeURIComponent(word)}&limit=500`,
  );

  if (!response.ok) {
    throw new Error(`Duplicate check failed: ${response.status}`);
  }

  const words = (await response.json()) as Word[];
  return words.some(
    (entry) => entry.word.toLowerCase() === word.toLowerCase(),
  );
}

/**
 * Call POST /resources/ and return the created resource.
 *
 * @param payload - The resource data conforming to ResourceFormValues.
 * @returns The created Resource object.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function createResource(
  payload: ResourceFormValues,
): Promise<Resource> {
  const response = await apiFetch("/resources/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ??
        `Create failed: ${response.status}`,
    );
  }

  return response.json() as Promise<Resource>;
}

/**
 * Call PUT /resources/{resourceId} and return the updated resource.
 *
 * @param resourceId - The ID of the resource to update.
 * @param payload - The updated resource data conforming to ResourceFormValues.
 * @returns The updated Resource object.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function updateResource(
  resourceId: number,
  payload: ResourceFormValues,
): Promise<Resource> {
  const response = await apiFetch(`/resources/${resourceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ??
        `Update failed: ${response.status}`,
    );
  }

  return response.json() as Promise<Resource>;
}

/**
 * Call DELETE /resources/{resourceId}.
 *
 * @param resourceId - The ID of the resource to delete.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function deleteResource(resourceId: number): Promise<void> {
  const response = await apiFetch(`/resources/${resourceId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

/**
 * Call POST /topics/ and return the created topic.
 *
 * @param payload - The topic data conforming to TopicFormValues.
 * @returns The created Topic object.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function createTopic(payload: TopicFormValues): Promise<Topic> {
  const response = await apiFetch("/topics/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ??
        `Create failed: ${response.status}`,
    );
  }

  return response.json() as Promise<Topic>;
}

/**
 * Call PUT /topics/{topicId} and return the updated topic.
 *
 * @param topicId - The ID of the topic to update.
 * @param payload - The updated topic data conforming to TopicFormValues.
 * @returns The updated Topic object.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function updateTopic(
  topicId: number,
  payload: TopicFormValues,
): Promise<Topic> {
  const response = await apiFetch(`/topics/${topicId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ??
        `Update failed: ${response.status}`,
    );
  }

  return response.json() as Promise<Topic>;
}

/**
 * Call DELETE /topics/{topicId}.
 *
 * @param topicId - The ID of the topic to delete.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function deleteTopic(topicId: number): Promise<void> {
  const response = await apiFetch(`/topics/${topicId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}
