'use client';

import { create } from 'zustand';

import {
  DEFAULT_SETTINGS,
  deleteSession,
  deleteVocabularyEntry,
  getSessions,
  getSettings,
  getVocabulary,
  saveSession,
  saveVocabularyEntry,
  updateSettings as persistSettings,
  updateVocabularyEntry,
} from '@/lib/storage';
import type {
  AppSettings,
  ReadingSession,
  VocabularyEntry,
} from '@/types';

interface VocabularyStore {
  vocabulary: VocabularyEntry[];
  sessions: ReadingSession[];
  settings: AppSettings;
  hydrated: boolean;

  hydrate: () => void;

  addWord: (entry: VocabularyEntry) => void;
  updateWord: (id: string, updates: Partial<VocabularyEntry>) => void;
  removeWord: (id: string) => void;

  addSession: (session: ReadingSession) => void;
  removeSession: (id: string) => void;

  updateSettings: (updates: Partial<AppSettings>) => void;
}

export const useVocabularyStore = create<VocabularyStore>((set, get) => ({
  vocabulary: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({
      vocabulary: getVocabulary(),
      sessions: getSessions(),
      settings: getSettings(),
      hydrated: true,
    });
  },

  addWord: (entry) => {
    saveVocabularyEntry(entry);
    set({ vocabulary: getVocabulary() });
  },

  updateWord: (id, updates) => {
    updateVocabularyEntry(id, updates);
    set({ vocabulary: getVocabulary() });
  },

  removeWord: (id) => {
    deleteVocabularyEntry(id);
    set({ vocabulary: getVocabulary() });
  },

  addSession: (session) => {
    saveSession(session);
    set({ sessions: getSessions() });
  },

  removeSession: (id) => {
    deleteSession(id);
    set({ sessions: getSessions() });
  },

  updateSettings: (updates) => {
    persistSettings(updates);
    set({ settings: getSettings() });
  },
}));
