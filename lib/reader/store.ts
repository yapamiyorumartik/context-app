'use client';

import { create } from 'zustand';

import type { ReadingSession } from '@/types';

export interface SelectedToken {
  word: string;
  sentence: string;
  paragraphIdx: number;
  sentenceIdx: number;
}

export type PopoverMode = 'word' | 'phrase';

export interface ActivePopover {
  /** The English word (or full phrase) being looked up. */
  word: string;
  /** Surrounding sentence — same as `word` when mode is 'phrase'. */
  sentence: string;
  /** Viewport-relative rect of the click target / selection end. */
  rect: { top: number; left: number; width: number; height: number };
  mode: PopoverMode;
}

export interface ToastState {
  id: string;
  message: string;
  onUndo?: () => void;
  createdAt: number;
}

interface ReaderStore {
  /** The text the user is currently reading, or null if on the paste screen. */
  currentSession: ReadingSession | null;
  /** Last word the user tapped — drives analytics / debugging. */
  selectedToken: SelectedToken | null;
  /**
   * Lemmas saved to vocabulary during this reading session.
   * The Article also receives the user's full saved-lemma set
   * (joined with the persisted vocabulary) for underline rendering.
   */
  savedWordIds: Set<string>;
  /** The popover currently open over the article, or null. */
  activePopover: ActivePopover | null;
  /** Single bottom-of-screen toast (with optional Undo). */
  toast: ToastState | null;

  setSession: (session: ReadingSession | null) => void;
  setSelectedToken: (token: SelectedToken | null) => void;
  setSavedWordIds: (ids: Set<string>) => void;
  addSavedWordId: (lemma: string) => void;

  showPopover: (popover: ActivePopover) => void;
  hidePopover: () => void;

  showToast: (message: string, opts?: { onUndo?: () => void }) => void;
  dismissToast: () => void;

  reset: () => void;
}

export const useReaderStore = create<ReaderStore>((set) => ({
  currentSession: null,
  selectedToken: null,
  savedWordIds: new Set<string>(),
  activePopover: null,
  toast: null,

  setSession: (currentSession) => set({ currentSession }),
  setSelectedToken: (selectedToken) => set({ selectedToken }),
  setSavedWordIds: (savedWordIds) => set({ savedWordIds }),
  addSavedWordId: (lemma) =>
    set((s) => {
      const next = new Set(s.savedWordIds);
      next.add(lemma);
      return { savedWordIds: next };
    }),

  showPopover: (activePopover) => set({ activePopover }),
  hidePopover: () => set({ activePopover: null }),

  showToast: (message, opts) =>
    set({
      toast: {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : String(Date.now()),
        message,
        onUndo: opts?.onUndo,
        createdAt: Date.now(),
      },
    }),
  dismissToast: () => set({ toast: null }),

  reset: () =>
    set({
      currentSession: null,
      selectedToken: null,
      savedWordIds: new Set<string>(),
      activePopover: null,
      toast: null,
    }),
}));
