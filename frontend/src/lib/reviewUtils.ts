import { SenseWithWord } from "@/types/word";

const REVIEW_THRESHOLDS: Record<string, number> = {
  Easy: 7,
  Medium: 3,
  Hard: 1,
  VeryHard: 0,
};

/**
 * Return true if this sense should display the "To Review" badge.
 *
 * Compares last_reviewed_at against the threshold (days) for the sense's
 * difficulty level. A sense with last_reviewed_at === null (never reviewed)
 * always returns true. VeryHard threshold is 0, so it always returns true.
 *
 * @param sense - The SenseWithWord object to evaluate.
 * @returns true if the sense is due for review, false otherwise.
 */
export function toReview(sense: SenseWithWord): boolean {
  if (!sense.last_reviewed_at) {
    return true;
  }

  const threshold = REVIEW_THRESHOLDS[sense.difficulty_level ?? "Medium"] ?? 3;

  if (threshold === 0) {
    return true;
  }

  const lastReviewed = new Date(sense.last_reviewed_at);
  const daysSince =
    (Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24);

  return daysSince >= threshold;
}
