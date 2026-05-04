'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReviewCompleteProps {
  totalSeconds: number;
  reviewed: number;
  correct: number;
  /** Number of retry-wave correct answers (out of `retried`). */
  recovered?: number;
  retried?: number;
  streak: number;
  /**
   * Last 7 days, oldest → today. `true` = a review was completed that day.
   * Today is always `true` (we just finished one).
   */
  weekDays?: boolean[];
}

export function ReviewComplete({
  totalSeconds,
  reviewed,
  correct,
  recovered = 0,
  retried = 0,
  streak,
  weekDays,
}: ReviewCompleteProps) {
  const perfect = reviewed > 0 && correct === reviewed;
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
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
        No guilt. No “come back tomorrow.”
      </p>
    </div>
  );
}
