'use client';

import { MotionConfig } from 'framer-motion';

/**
 * App-wide framer-motion config.
 * `reducedMotion="user"` disables all animations when the OS reports
 * `prefers-reduced-motion: reduce`.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
