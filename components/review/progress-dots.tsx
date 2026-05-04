'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

interface ProgressDotsProps {
  total: number;
  current: number; // 0-based index of the IN-PROGRESS challenge
  /** Index where the re-review wave begins (null if no retry). */
  reReviewStart?: number | null;
}

export function ProgressDots({
  total,
  current,
  reReviewStart,
}: ProgressDotsProps) {
  const inRetry =
    reReviewStart !== null &&
    reReviewStart !== undefined &&
    current >= reReviewStart;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i <= current;
          const isRetry =
            reReviewStart !== null &&
            reReviewStart !== undefined &&
            i >= reReviewStart;
          return (
            <motion.span
              key={i}
              initial={false}
              animate={{ scale: filled ? 1 : 0.8, opacity: filled ? 1 : 0.5 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                isRetry
                  ? filled
                    ? 'bg-amber-500'
                    : 'bg-amber-500/40'
                  : filled
                  ? 'bg-foreground'
                  : 'bg-muted-foreground/40'
              )}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div className="text-[11px] tabular-nums text-muted-foreground">
        {inRetry ? 'Retry · ' : ''}
        {Math.min(current + 1, total)} of {total}
      </div>
    </div>
  );
}
