'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

import { useReaderStore } from '@/lib/reader/store';

const AUTO_DISMISS_MS = 5000;

export function ReaderToast() {
  const toast = useReaderStore((s) => s.toast);
  const dismissToast = useReaderStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border/60 bg-background py-1.5 pl-4 pr-1.5 text-sm shadow-md"
        >
          <span className="text-foreground">{toast.message}</span>
          {toast.onUndo ? (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                dismissToast();
              }}
              className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Undo
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
