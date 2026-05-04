'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VocabularyEntry } from '@/types';

interface ReviewCompleteProps {
  totalSeconds: number;
  reviewed: number;
  correct: number;
  recovered?: number;
  retried?: number;
  streak: number;
  weekDays?: boolean[];
  sessionEntries?: VocabularyEntry[];
}

export function ReviewComplete({
  totalSeconds,
  reviewed,
  correct,
  recovered = 0,
  retried = 0,
  streak,
  weekDays,
  sessionEntries,
}: ReviewCompleteProps) {
  const perfect = reviewed > 0 && correct === reviewed;
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;

  return (
    <div className="mx-auto max-w-[560px] px-4 pb-24 pt-8 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <Sparkles
            aria-hidden="true"
            className={cn(
              'h-12 w-12',
              perfect
                ? 'text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.55)]'
                : 'text-foreground/70'
            )}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="mt-6 font-serif text-2xl tracking-tight sm:text-3xl"
        >
          Nice. Done in {totalSeconds}s.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: 'easeOut' }}
          className="mt-3 text-sm text-muted-foreground"
        >
          {reviewed} reviewed · {correct} correct ({accuracy}%)
        </motion.p>

        {retried > 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: 'easeOut' }}
            className="mt-1 text-sm text-amber-700/80"
          >
            Recovered {recovered} of {retried} on retry
          </motion.p>
        ) : null}

        {streak > 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24, ease: 'easeOut' }}
            className="mt-1 text-sm text-muted-foreground"
          >
            Streak: {streak} day{streak === 1 ? '' : 's'} 🔥
          </motion.p>
        ) : null}

        {weekDays && weekDays.length === 7 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: 'easeOut' }}
            className="mt-4 flex items-center gap-1.5"
            aria-label="Last 7 days"
          >
            {weekDays.map((on, i) => (
              <span
                key={i}
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  on ? 'bg-foreground' : 'bg-muted-foreground/25'
                )}
                aria-hidden="true"
              />
            ))}
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32, ease: 'easeOut' }}
          className="mt-8 w-full"
        >
          <Button asChild size="lg" className="w-full sm:w-auto sm:px-10">
            <Link href="/">Done</Link>
          </Button>
        </motion.div>

        <p className="mt-6 text-[11px] text-muted-foreground/80">
          No guilt. No &ldquo;come back tomorrow.&rdquo;
        </p>
      </div>

      {sessionEntries && sessionEntries.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
          className="mt-12 border-t border-border/60 pt-8"
        >
          <p className="mb-4 text-[11px] uppercase tracking-wide text-muted-foreground">
            Bu oturumda tekrarladıkların
          </p>
          <ul className="space-y-4">
            {sessionEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </ul>
        </motion.div>
      ) : null}
    </div>
  );
}

function EntryCard({ entry }: { entry: VocabularyEntry }) {
  const meaningTr =
    entry.selectedMeaning.definitionTr || entry.selectedMeaning.definitionEn;
  const sentence = entry.contextSentence;
  const word = entry.word;

  const parts = splitSentence(sentence, word);

  return (
    <li className="rounded-md border border-border/60 bg-card px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-base font-semibold text-foreground">
          {word}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {entry.selectedMeaning.partOfSpeech}
        </span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{meaningTr}</p>
      <p className="mt-2 font-serif text-[15px] leading-relaxed text-[#2A2A2A]">
        {parts.map((p, i) =>
          p.match ? (
            <strong key={i} className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-2">
              {p.text}
            </strong>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </p>
    </li>
  );
}

function splitSentence(
  text: string,
  word: string
): { text: string; match: boolean }[] {
  if (!word) return [{ text, match: false }];
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  const tokens = text.split(re);
  const lower = word.toLowerCase();
  return tokens
    .filter((t) => t.length > 0)
    .map((t) => ({ text: t, match: t.toLowerCase() === lower }));
}
