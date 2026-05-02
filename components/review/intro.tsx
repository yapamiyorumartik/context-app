'use client';

import { motion } from 'framer-motion';

interface IntroProps {
  count: number;
}

export function ReviewIntro({ count }: IntroProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <p className="font-serif text-2xl tracking-tight sm:text-3xl">
          {count} word{count === 1 ? '' : 's'}. ~{Math.max(20, count * 20)}s.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Let’s go.</p>
      </motion.div>
    </div>
  );
}
