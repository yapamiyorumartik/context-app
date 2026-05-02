'use client';

import { useMemo } from 'react';

import { Greeting } from '@/components/home/greeting';
import { PrimaryCard } from '@/components/home/primary-card';
import { SecondaryCards } from '@/components/home/secondary-cards';
import { useHydratedStore } from '@/hooks/useHydratedStore';
import { useVocabularyStore } from '@/lib/storage/store';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function HomePage() {
  const hydrated = useHydratedStore();
  const vocabulary = useVocabularyStore((s) => s.vocabulary);
  const sessions = useVocabularyStore((s) => s.sessions);
  const settings = useVocabularyStore((s) => s.settings);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return vocabulary.filter((v) => v.nextReviewAt <= now).length;
  }, [vocabulary]);

  const nextReviewIn = useMemo<number | null>(() => {
    if (vocabulary.length === 0) return null;
    const now = Date.now();
    const future = vocabulary
      .filter((v) => v.nextReviewAt > now)
      .map((v) => v.nextReviewAt);
    if (future.length === 0) return null;
    return Math.min(...future) - now;
  }, [vocabulary]);

  const weekReviewed = useMemo(() => {
    const cutoff = Date.now() - WEEK_MS;
    return vocabulary.filter(
      (v) => v.lastReviewedAt !== undefined && v.lastReviewedAt >= cutoff
    ).length;
  }, [vocabulary]);

  const accuracy = useMemo<number | null>(() => {
    let total = 0;
    let correct = 0;
    for (const v of vocabulary) {
      total += v.reviewCount;
      correct += v.correctCount;
    }
    return total > 0 ? Math.round((correct / total) * 100) : null;
  }, [vocabulary]);

  const lastSession = sessions[0];

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <Greeting />

      <div className="mt-8">
        {hydrated ? (
          <PrimaryCard dueCount={dueCount} nextReviewIn={nextReviewIn} />
        ) : (
          <div className="h-[112px] animate-pulse rounded-xl border border-border/60 bg-card" />
        )}
      </div>

      <div className="mt-4">
        {hydrated ? (
          <SecondaryCards
            lastSession={lastSession}
            totalWords={vocabulary.length}
            streak={settings.reviewStreak}
            weekReviewed={weekReviewed}
            accuracy={accuracy}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-[120px] animate-pulse rounded-lg border border-border/60 bg-card" />
            <div className="h-[120px] animate-pulse rounded-lg border border-border/60 bg-card" />
          </div>
        )}
      </div>
    </div>
  );
}
