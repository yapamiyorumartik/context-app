import type { VocabularyEntry } from '@/types';

const FAST_THRESHOLD_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

const MAX_EASE = 3.0;
const MIN_EASE = 1.3;

/**
 * Simplified SM-2 update.
 *
 * - First correct review → 1 day, second → 3 days, after that → interval × ease.
 * - Wrong answer → reset to 1 day, ease drops by 0.2 (floor 1.3).
 * - Answering correctly in under 5s nudges ease up by 0.1 (cap 3.0).
 */
export function updateSRS(
  entry: VocabularyEntry,
  correct: boolean,
  timeMs: number
): VocabularyEntry {
  const fast = timeMs < FAST_THRESHOLD_MS;
  let { easeFactor, intervalDays } = entry;

  if (correct) {
    if (entry.reviewCount === 0) intervalDays = 1;
    else if (entry.reviewCount === 1) intervalDays = 3;
    else intervalDays = Math.round(intervalDays * easeFactor);

    if (fast) easeFactor = Math.min(easeFactor + 0.1, MAX_EASE);
  } else {
    intervalDays = 1;
    easeFactor = Math.max(easeFactor - 0.2, MIN_EASE);
  }

  return {
    ...entry,
    easeFactor,
    intervalDays,
    nextReviewAt: Date.now() + intervalDays * DAY_MS,
    reviewCount: entry.reviewCount + 1,
    correctCount: entry.correctCount + (correct ? 1 : 0),
    lastReviewedAt: Date.now(),
  };
}
