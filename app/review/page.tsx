'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

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
// Bumped from 3 → 4 to align with `challenges.ts` MULTI_WORD_MIN_POOL.
// Below 4, only meaning_match challenges can be generated, which is a
// degenerate experience.
const MIN_VOCAB_FOR_REVIEW = 4;

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
  // null = no re-review wave yet. Once set, indexes >= this are retry challenges.
  const [reReviewStart, setReReviewStart] = useState<number | null>(null);
  const sessionStartedAt = useRef<number>(Date.now());
  const finalStreakRef = useRef<number>(settings.reviewStreak);
  const wrongEntryIds = useRef<Set<string>>(new Set());

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

  const inReReviewWave =
    reReviewStart !== null && currentIdx >= reReviewStart;

  const finishSession = (mainBatchSize: number) => {
    const streakUpdate = computeStreakUpdate(settings, mainBatchSize);
    updateSettings(streakUpdate);
    finalStreakRef.current = streakUpdate.reviewStreak;
    setPhase('complete');
  };

  const advanceOrFinish = (
    nextChallenges: Challenge[],
    nextWrongIds: Set<string>
  ) => {
    if (currentIdx + 1 < nextChallenges.length) {
      setCurrentIdx((i) => i + 1);
      return;
    }

    // End of main batch — start re-review wave if we have wrong entries
    // and we haven't already done one.
    if (reReviewStart === null && nextWrongIds.size > 0) {
      const wrongEntries = vocabulary.filter((v) => nextWrongIds.has(v.id));
      if (wrongEntries.length > 0) {
        // Retry wave uses the dictionary `example` sentence when available
        // so the word is reinforced in a *different* context than the one
        // the user originally saved it from.
        const retryChallenges = buildChallenges(wrongEntries, vocabulary, {
          useExampleSentence: true,
        });
        const startIdx = nextChallenges.length;
        setChallenges([...nextChallenges, ...retryChallenges]);
        setReReviewStart(startIdx);
        setCurrentIdx(startIdx);
        return;
      }
    }

    // True end — main batch size is what counts toward streak/totals.
    const mainSize = reReviewStart ?? nextChallenges.length;
    finishSession(mainSize);
  };

  const handleAnswer = ({ correct, timeMs }: AnswerResult) => {
    const challenge = challenges[currentIdx];

    // SRS only updates on the FIRST pass. Re-review is for retention practice;
    // double-counting would distort the ease factor.
    if (!inReReviewWave) {
      const updated = updateSRS(challenge.entry, correct, timeMs);
      updateWord(challenge.entry.id, {
        easeFactor: updated.easeFactor,
        intervalDays: updated.intervalDays,
        nextReviewAt: updated.nextReviewAt,
        reviewCount: updated.reviewCount,
        correctCount: updated.correctCount,
        lastReviewedAt: updated.lastReviewedAt,
      });

      if (!correct) wrongEntryIds.current.add(challenge.entry.id);
    }

    setAnswers((a) => [...a, { correct, timeMs }]);
    advanceOrFinish(challenges, wrongEntryIds.current);
  };

  const handleSkip = () => {
    if (inReReviewWave) {
      // In re-review, skipping just moves on — neither SRS nor wrong list changes.
      advanceOrFinish(challenges, wrongEntryIds.current);
      return;
    }
    // In main batch, skip leaves SRS untouched (word stays due) and isn't
    // counted in answers — so it doesn't drag accuracy down.
    advanceOrFinish(challenges, wrongEntryIds.current);
  };

  if (phase === 'intro') {
    const introCount = reReviewStart ?? challenges.length;
    return <ReviewIntro count={introCount} />;
  }

  if (phase === 'complete') {
    const totalSeconds = Math.max(
      1,
      Math.round((Date.now() - sessionStartedAt.current) / 1000)
    );
    // Only count main-batch answers toward accuracy. Retry answers are
    // displayed separately.
    const mainEnd = reReviewStart ?? answers.length;
    const mainAnswers = answers.slice(0, mainEnd);
    const retryAnswers = answers.slice(mainEnd);
    const correct = mainAnswers.filter((a) => a.correct).length;
    const recovered = retryAnswers.filter((a) => a.correct).length;
    return (
      <ReviewComplete
        totalSeconds={totalSeconds}
        reviewed={mainAnswers.length}
        correct={correct}
        recovered={recovered}
        retried={retryAnswers.length}
        streak={finalStreakRef.current}
        weekDays={lastSevenDayFlags(settings.reviewLog, todayStr())}
      />
    );
  }

  // CHALLENGE phase
  const current = challenges[currentIdx];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[560px] flex-col px-4 pb-10 pt-4 sm:px-6 sm:pt-8">
      <ProgressDots
        total={challenges.length}
        current={currentIdx}
        reReviewStart={reReviewStart}
      />

      <div className="mt-6 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <ChallengeCard
              challenge={current}
              pool={vocabulary}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              enableShake={settings.enableReviewShake ?? true}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Streak helpers ─────────────────────────────────────────────────────────

// Use the user's LOCAL day, not UTC — otherwise a 02:00 review in Turkey
// (UTC+3) is filed under "yesterday" and breaks the streak.
function localDayStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(now: Date = new Date()): string {
  return localDayStr(now);
}

function yesterdayStr(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return localDayStr(d);
}

function parseLocalDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Return 7 booleans (oldest → today) marking which of the last 7 local days
 * had a completed review session. `today` is always set true because we call
 * this after the streak update has logged it.
 */
function lastSevenDayFlags(
  log: readonly string[] | undefined,
  today: string
): boolean[] {
  const set = new Set([...(log ?? []), today]);
  const t = parseLocalDay(today);
  const flags: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(d.getDate() - i);
    flags.push(set.has(localDayStr(d)));
  }
  return flags;
}

const REVIEW_LOG_MAX = 30;

function appendToLog(log: readonly string[] | undefined, day: string): string[] {
  const next = new Set(log ?? []);
  next.add(day);
  // Keep at most the last REVIEW_LOG_MAX days, sorted ascending.
  return Array.from(next).sort().slice(-REVIEW_LOG_MAX);
}

function computeStreakUpdate(
  settings: AppSettings,
  reviewedNow: number
): Pick<
  AppSettings,
  'reviewStreak' | 'lastReviewDate' | 'totalWordsReviewed' | 'reviewLog'
> {
  const today = todayStr();
  const totalWordsReviewed = settings.totalWordsReviewed + reviewedNow;
  const reviewLog = appendToLog(settings.reviewLog, today);

  if (settings.lastReviewDate === today) {
    return {
      reviewStreak: settings.reviewStreak,
      lastReviewDate: today,
      totalWordsReviewed,
      reviewLog,
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
    reviewLog,
  };
}
