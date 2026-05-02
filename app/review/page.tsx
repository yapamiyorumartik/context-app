'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ChallengeCard } from '@/components/review/challenge-card';
import { ReviewComplete } from '@/components/review/complete';
import { ReviewEmpty } from '@/components/review/empty';
import { ReviewIntro } from '@/components/review/intro';
import { ProgressDots } from '@/components/review/progress-dots';
import { useHydratedStore } from '@/hooks/useHydratedStore';
import { useVocabularyStore } from '@/lib/storage/store';
import {
  buildChallenges,
  selectReviewBatch,
  updateSRS,
  type Challenge,
} from '@/lib/srs';
import type { AppSettings } from '@/types';

const INTRO_MS = 1000;
const MIN_VOCAB_FOR_REVIEW = 3;

type Phase = 'intro' | 'challenge' | 'complete';

interface AnswerResult {
  correct: boolean;
  timeMs: number;
}

export default function ReviewPage() {
  const hydrated = useHydratedStore();
  const vocabulary = useVocabularyStore((s) => s.vocabulary);
  const settings = useVocabularyStore((s) => s.settings);
  const updateWord = useVocabularyStore((s) => s.updateWord);
  const updateSettings = useVocabularyStore((s) => s.updateSettings);

  const [phase, setPhase] = useState<Phase>('intro');
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const sessionStartedAt = useRef<number>(Date.now());
  const finalStreakRef = useRef<number>(settings.reviewStreak);

  // Build the batch + challenges once, after hydration.
  useEffect(() => {
    if (!hydrated) return;
    if (challenges !== null) return;
    const batch = selectReviewBatch(vocabulary);
    if (batch.length === 0) {
      setChallenges([]);
      return;
    }
    setChallenges(buildChallenges(batch, vocabulary));
    sessionStartedAt.current = Date.now();
  }, [hydrated, vocabulary, challenges]);

  // Auto-advance from intro after 1s — but only if we actually have something.
  useEffect(() => {
    if (phase !== 'intro') return;
    if (!challenges || challenges.length === 0) return;
    const t = window.setTimeout(() => setPhase('challenge'), INTRO_MS);
    return () => window.clearTimeout(t);
  }, [phase, challenges]);

  if (!hydrated) {
    return <div className="min-h-[60vh]" />;
  }

  if (vocabulary.length < MIN_VOCAB_FOR_REVIEW) {
    return <ReviewEmpty minWords />;
  }

  if (challenges !== null && challenges.length === 0) {
    return <ReviewEmpty />;
  }

  if (challenges === null) {
    return <div className="min-h-[60vh]" />;
  }

  const handleAnswer = ({ correct, timeMs }: AnswerResult) => {
    const challenge = challenges[currentIdx];
    const updated = updateSRS(challenge.entry, correct, timeMs);
    // Persist immediately — survives mid-session navigation.
    updateWord(challenge.entry.id, {
      easeFactor: updated.easeFactor,
      intervalDays: updated.intervalDays,
      nextReviewAt: updated.nextReviewAt,
      reviewCount: updated.reviewCount,
      correctCount: updated.correctCount,
      lastReviewedAt: updated.lastReviewedAt,
    });

    const nextAnswers = [...answers, { correct, timeMs }];
    setAnswers(nextAnswers);

    if (currentIdx + 1 < challenges.length) {
      setCurrentIdx((i) => i + 1);
      return;
    }

    // Final challenge — update streak and totals, then move to complete.
    const streakUpdate = computeStreakUpdate(settings, challenges.length);
    updateSettings(streakUpdate);
    finalStreakRef.current = streakUpdate.reviewStreak;
    setPhase('complete');
  };

  if (phase === 'intro') {
    return <ReviewIntro count={challenges.length} />;
  }

  if (phase === 'complete') {
    const totalSeconds = Math.max(
      1,
      Math.round((Date.now() - sessionStartedAt.current) / 1000)
    );
    const correct = answers.filter((a) => a.correct).length;
    return (
      <ReviewComplete
        totalSeconds={totalSeconds}
        reviewed={answers.length}
        correct={correct}
        streak={finalStreakRef.current}
      />
    );
  }

  // CHALLENGE phase
  const current = challenges[currentIdx];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[560px] flex-col px-4 pb-10 pt-4 sm:px-6 sm:pt-8">
      <ProgressDots total={challenges.length} current={currentIdx} />

      <div className="mt-6 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <ChallengeCard challenge={current} onAnswer={handleAnswer} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Streak helpers ─────────────────────────────────────────────────────────

function todayStr(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function yesterdayStr(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function computeStreakUpdate(
  settings: AppSettings,
  reviewedNow: number
): Pick<AppSettings, 'reviewStreak' | 'lastReviewDate' | 'totalWordsReviewed'> {
  const today = todayStr();
  const totalWordsReviewed = settings.totalWordsReviewed + reviewedNow;

  if (settings.lastReviewDate === today) {
    return {
      reviewStreak: settings.reviewStreak,
      lastReviewDate: today,
      totalWordsReviewed,
    };
  }

  let nextStreak = 1;
  if (settings.lastReviewDate === yesterdayStr()) {
    nextStreak = settings.reviewStreak + 1;
  }
  return {
    reviewStreak: nextStreak,
    lastReviewDate: today,
    totalWordsReviewed,
  };
}
