import type {
  AppSettings,
  ReadingSession,
  VocabularyEntry,
  WordMeaning,
} from '@/types';

const KEYS = {
  vocabulary: 'context.vocabulary.v1',
  sessions: 'context.sessions.v1',
  settings: 'context.settings.v1',
  translationCache: 'context.translationCache.v1',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  hasSeenOnboarding: false,
  reviewStreak: 0,
  totalWordsReviewed: 0,
};

const TRANSLATION_CACHE_LIMIT = 500;

function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  );
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ───── Vocabulary ─────

export function getVocabulary(): VocabularyEntry[] {
  const value = readJSON<unknown>(KEYS.vocabulary, []);
  return Array.isArray(value) ? (value as VocabularyEntry[]) : [];
}

export function saveVocabularyEntry(entry: VocabularyEntry): void {
  const current = getVocabulary();
  const next = [entry, ...current.filter((e) => e.id !== entry.id)];
  writeJSON(KEYS.vocabulary, next);
}

export function updateVocabularyEntry(
  id: string,
  updates: Partial<VocabularyEntry>
): void {
  const current = getVocabulary();
  const next = current.map((e) => (e.id === id ? { ...e, ...updates } : e));
  writeJSON(KEYS.vocabulary, next);
}

export function deleteVocabularyEntry(id: string): void {
  const next = getVocabulary().filter((e) => e.id !== id);
  writeJSON(KEYS.vocabulary, next);
}

// ───── Sessions ─────

export function getSessions(): ReadingSession[] {
  const value = readJSON<unknown>(KEYS.sessions, []);
  return Array.isArray(value) ? (value as ReadingSession[]) : [];
}

export function saveSession(session: ReadingSession): void {
  const current = getSessions();
  const next = [session, ...current.filter((s) => s.id !== session.id)];
  writeJSON(KEYS.sessions, next);
}

export function deleteSession(id: string): void {
  const next = getSessions().filter((s) => s.id !== id);
  writeJSON(KEYS.sessions, next);
}

// ───── Settings ─────

export function getSettings(): AppSettings {
  const stored = readJSON<Partial<AppSettings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function updateSettings(updates: Partial<AppSettings>): void {
  const next = { ...getSettings(), ...updates };
  writeJSON(KEYS.settings, next);
}

// ───── Translation cache ─────
// Persisted shape matches { [hash]: WordMeaning[] }.
// LRU is implemented via JS object insertion order: on read or re-set,
// we delete-then-reinsert so the entry moves to the "newest" end.
// When the cache exceeds the limit, we drop entries from the front.

type TranslationCache = Record<string, WordMeaning[]>;

function readTranslationCache(): TranslationCache {
  const value = readJSON<unknown>(KEYS.translationCache, {});
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as TranslationCache;
}

function writeTranslationCache(cache: TranslationCache): void {
  writeJSON(KEYS.translationCache, cache);
}

export function getCachedTranslation(hash: string): WordMeaning[] | null {
  const cache = readTranslationCache();
  const meanings = cache[hash];
  if (!meanings) return null;
  // touch: move to most-recent end of insertion order
  delete cache[hash];
  cache[hash] = meanings;
  writeTranslationCache(cache);
  return meanings;
}

export function setCachedTranslation(
  hash: string,
  meanings: WordMeaning[]
): void {
  const cache = readTranslationCache();
  if (hash in cache) delete cache[hash];
  cache[hash] = meanings;

  const keys = Object.keys(cache);
  const overflow = keys.length - TRANSLATION_CACHE_LIMIT;
  if (overflow > 0) {
    for (let i = 0; i < overflow; i++) {
      delete cache[keys[i]];
    }
  }

  writeTranslationCache(cache);
}

// ───── Wipe ─────

export function clearAllData(): void {
  if (!isBrowser()) return;
  for (const key of Object.values(KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore quota / private-mode errors
    }
  }
}

// ───── Export / import ─────

interface ExportPayload {
  version: 1;
  exportedAt: string;
  vocabulary: VocabularyEntry[];
  sessions: ReadingSession[];
  settings: AppSettings;
  translationCache: TranslationCache;
}

export function exportAllData(): Blob {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    vocabulary: getVocabulary(),
    sessions: getSessions(),
    settings: getSettings(),
    translationCache: readTranslationCache(),
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
}

export function importAllData(jsonText: string): {
  success: boolean;
  message: string;
} {
  if (!isBrowser()) {
    return { success: false, message: 'Import requires a browser context.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { success: false, message: 'Invalid JSON.' };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { success: false, message: 'Invalid file: not a JSON object.' };
  }
  const data = parsed as Partial<ExportPayload>;
  let restored = 0;
  if (Array.isArray(data.vocabulary)) {
    writeJSON(KEYS.vocabulary, data.vocabulary);
    restored++;
  }
  if (Array.isArray(data.sessions)) {
    writeJSON(KEYS.sessions, data.sessions);
    restored++;
  }
  if (data.settings && typeof data.settings === 'object') {
    writeJSON(KEYS.settings, data.settings);
    restored++;
  }
  if (
    data.translationCache &&
    typeof data.translationCache === 'object' &&
    !Array.isArray(data.translationCache)
  ) {
    writeJSON(KEYS.translationCache, data.translationCache);
    restored++;
  }
  if (restored === 0) {
    return {
      success: false,
      message: 'File contained no recognizable Context data.',
    };
  }
  return { success: true, message: `Imported ${restored} section(s).` };
}
