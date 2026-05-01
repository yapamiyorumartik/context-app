/**
 * Manual smoke tests for the storage layer.
 *
 * Not part of any production code path.
 * To run from a browser console while the dev server is up:
 *
 *   const t = await import('/lib/storage/__test');
 *   await t.runAll();
 *
 * Or temporarily import { runAll } in a page and call it inside a useEffect.
 *
 * Each test logs results to the console and leaves localStorage in a tidy
 * state (any rows it creates, it deletes — except settings, which is
 * idempotent).
 */

import {
  deleteSession,
  deleteVocabularyEntry,
  exportAllData,
  getCachedTranslation,
  getSessions,
  getSettings,
  getVocabulary,
  importAllData,
  saveSession,
  saveVocabularyEntry,
  setCachedTranslation,
  updateSettings,
  updateVocabularyEntry,
} from '@/lib/storage';
import { hashContext } from '@/lib/utils/hash';
import type {
  ReadingSession,
  VocabularyEntry,
  WordMeaning,
} from '@/types';

function makeMeaning(suffix = ''): WordMeaning {
  return {
    partOfSpeech: 'noun',
    definitionEn: `a place where someone lives${suffix}`,
    definitionTr: `birinin yaşadığı yer${suffix}`,
    example: 'Please write your address here.',
  };
}

function makeEntry(word = 'Address'): VocabularyEntry {
  const meaning = makeMeaning();
  return {
    id: crypto.randomUUID(),
    word,
    lemma: word.toLowerCase(),
    contextSentence: 'Please write your address here.',
    selectedMeaning: meaning,
    allMeanings: [meaning],
    createdAt: Date.now(),
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: Date.now() + 86_400_000,
    reviewCount: 0,
    correctCount: 0,
  };
}

export function testVocabulary(): void {
  console.group('vocabulary');
  const before = getVocabulary().length;
  const entry = makeEntry();

  saveVocabularyEntry(entry);
  console.log('after save:', getVocabulary().length, '(was', before, ')');

  updateVocabularyEntry(entry.id, { reviewCount: 1, correctCount: 1 });
  const updated = getVocabulary().find((e) => e.id === entry.id);
  console.log('after update reviewCount:', updated?.reviewCount);

  deleteVocabularyEntry(entry.id);
  console.log('after delete:', getVocabulary().length);
  console.groupEnd();
}

export function testSessions(): void {
  console.group('sessions');
  const session: ReadingSession = {
    id: crypto.randomUUID(),
    title: 'A short article about productivity',
    text: 'A short article about productivity and focus...',
    createdAt: Date.now(),
    wordCount: 9,
  };
  saveSession(session);
  console.log('after save:', getSessions().length);
  deleteSession(session.id);
  console.log('after delete:', getSessions().length);
  console.groupEnd();
}

export function testSettings(): void {
  console.group('settings');
  console.log('current:', getSettings());
  updateSettings({ reviewStreak: getSettings().reviewStreak + 1 });
  console.log('after bump:', getSettings());
  console.groupEnd();
}

export async function testTranslationCache(): Promise<void> {
  console.group('translation cache');
  const hash = await hashContext(
    'address',
    'Please write your address here.'
  );
  setCachedTranslation(hash, [makeMeaning(' (cached)')]);
  console.log('hit:', getCachedTranslation(hash));
  console.log('miss:', getCachedTranslation('does-not-exist'));
  console.groupEnd();
}

export function testCacheLRU(): void {
  console.group('translation cache LRU');
  // Insert 510 entries; oldest 10 should be evicted (limit is 500).
  for (let i = 0; i < 510; i++) {
    setCachedTranslation(`__lru-test-${i}`, [makeMeaning(` ${i}`)]);
  }
  const hitOld = getCachedTranslation('__lru-test-0');
  const hitNew = getCachedTranslation('__lru-test-509');
  console.log('oldest evicted (expect null):', hitOld);
  console.log('newest present (expect array):', hitNew);
  // Cleanup test entries we can identify.
  for (let i = 0; i < 510; i++) {
    setCachedTranslation(`__lru-test-${i}`, []);
  }
  console.groupEnd();
}

export async function testExportImport(): Promise<void> {
  console.group('export/import');
  const blob = exportAllData();
  console.log('export size:', blob.size, 'bytes');
  const text = await blob.text();
  const result = importAllData(text);
  console.log('import:', result);
  const bad = importAllData('not json');
  console.log('import bad json:', bad);
  console.groupEnd();
}

export async function runAll(): Promise<void> {
  testVocabulary();
  testSessions();
  testSettings();
  await testTranslationCache();
  testCacheLRU();
  await testExportImport();
}
