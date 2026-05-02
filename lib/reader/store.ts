'use client';

import { create } from 'zustand';

import type { ReadingSession } from '@/types';

export interface SelectedToken {
  word: string;
  sentence: string;
  paragraphIdx: number;
  sentenceIdx: number;
}

interface ReaderStore {
  /** The text the user is currently reading, or null if on the paste screen. */
  currentSession: ReadingSession | null;
  /** Last word the user tapped — drives the translation popover (next prompt). */
  selectedToken: SelectedToken | null;
  /**
   * Lemmas saved to vocabulary during this reading session.
   * The Article also receives the user's full saved-lemma set
   * (joined with the persisted vocabulary) for underline rendering.
   */
  savedWordIds: Set<string>;

  setSession: (session: ReadingSession | null) => void;
  setSelectedToken: (token: SelectedToken | null) => void;
  setSavedWordIds: (ids: Set<string>) => void;
  addSavedWordId: (lemma: string) => void;
  reset: () => void;
}

export const useReaderStore = create<ReaderStore>((set) => ({
  currentSession: null,
  selectedToken: null,
  savedWordIds: new Set<string>(),

  setSession: (currentSession) => set({ currentSession }),
  setSelectedToken: (selectedToken) => set({ selectedToken }),
  setSavedWordIds: (savedWordIds) => set({ savedWordIds }),
  addSavedWordId: (lemma) =>
    set((s) => {
      const next = new Set(s.savedWordIds);
      next.add(lemma);
      return { savedWordIds: next };
    }),
  reset: () =>
    set({
      currentSession: null,
      selectedToken: null,
      savedWordIds: new Set<string>(),
    }),
}));
