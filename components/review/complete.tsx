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
  streak: number;
}

export function ReviewComplete({
  totalSeconds,
  reviewed,
  correct,
  streak,
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
