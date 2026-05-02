import type { VocabularyEntry } from '@/types';

export const TARGET_BATCH_SIZE = 3;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pick up to {@link TARGET_BATCH_SIZE} entries for a single review session.
 *
 * Priority:
 *   1. Words past their `nextReviewAt` (oldest first).
 *   2. Recently saved words that have never been reviewed (newest first).
 *   3. Words with the lowest correct/total ratio — i.e. struggling words.
 *
 * Returns fewer than {@link TARGET_BATCH_SIZE} only when the vocabulary
 * itself is smaller than that.
 */
export function selectReviewBatch(
  vocabulary: VocabularyEntry[]
): VocabularyEntry[] {
  const now = Date.now();
  const TARGET = TARGET_BATCH_SIZE;

  const due = vocabulary
    .filter((v) => v.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);

  if (due.length >= TARGET) return due.slice(0, TARGET);

  const picked: VocabularyEntry[] = [...due];
  const pickedIds = new Set(picked.map((v) => v.id));

  const recent = vocabulary
    .filter(
      (v) =>
        !pickedIds.has(v.id) &&
        v.reviewCount === 0 &&
        v.createdAt >= now - SEVEN_DAYS_MS
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  for (const v of recent) {
    if (picked.length >= TARGET) break;
    picked.push(v);
    pickedIds.add(v.id);
  }
  if (picked.length >= TARGET) return picked;

  const ratio = (v: VocabularyEntry) =>
    v.reviewCount > 0 ? v.correctCount / v.reviewCount : 0;

  const remaining = vocabulary
    .filter((v) => !pickedIds.has(v.id))
    .sort((a, b) => ratio(a) - ratio(b));

  for (const v of remaining) {
    if (picked.length >= TARGET) break;
    picked.push(v);
  }

  return picked;
}
