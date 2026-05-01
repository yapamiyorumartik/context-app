import {
  getCachedTranslation,
  setCachedTranslation,
} from '@/lib/storage';
import { hashContext } from '@/lib/utils/hash';
import type { PartOfSpeech, WordMeaning } from '@/types';

import { fetchWordDefinition } from './dictionary';
import { translateText } from './mymemory';
import { guessWordRole } from './pos-heuristic';
import type { TranslationResult } from './types';

const VALID_POS: ReadonlySet<PartOfSpeech> = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'other',
]);

function normalizePos(pos: string): PartOfSpeech {
  const lower = pos.toLowerCase();
  return VALID_POS.has(lower as PartOfSpeech)
    ? (lower as PartOfSpeech)
    : 'other';
}

function pickPrimaryIndex(
  meanings: WordMeaning[],
  word: string,
  sentence: string
): number {
  if (meanings.length === 0) return 0;
  const guessed = guessWordRole(word, sentence);
  if (!guessed) return 0;
  const idx = meanings.findIndex((m) => m.partOfSpeech === guessed);
  return idx >= 0 ? idx : 0;
}

export async function translateWord(
  word: string,
  sentence: string
): Promise<TranslationResult> {
  // 1. Cache check (no-op on Edge / server — localStorage is browser-only).
  const hash = await hashContext(word, sentence);
  const cached = getCachedTranslation(hash);
  if (cached && cached.length > 0) {
    return {
      word,
      meanings: cached,
      primaryMeaningIndex: pickPrimaryIndex(cached, word, sentence),
      source: 'dictionary',
    };
  }

  // 2. Fetch from Free Dictionary.
  const dict = await fetchWordDefinition(word);

  // 3. Dictionary missing → fall back to a single-word MyMemory translation.
  if (!dict) {
    const tr = await translateText(word);
    return {
      word,
      meanings: tr
        ? [
            {
              partOfSpeech: 'other',
              definitionEn: word,
              definitionTr: tr,
            },
          ]
        : [],
      primaryMeaningIndex: 0,
      source: 'fallback',
    };
  }

  // 4. Build the meaning list — top 2 definitions per POS.
  const allMeanings: WordMeaning[] = [];
  for (const entry of dict.meanings) {
    const pos = normalizePos(entry.partOfSpeech);
    for (const def of entry.definitions.slice(0, 2)) {
      allMeanings.push({
        partOfSpeech: pos,
        definitionEn: def.definition,
        definitionTr: '',
        example: def.example,
      });
    }
  }

  if (allMeanings.length === 0) {
    return {
      word,
      meanings: [],
      primaryMeaningIndex: 0,
      source: 'fallback',
    };
  }

  // 5. Translate the first 4 definitions to Turkish (parallel).
  //    Beyond index 3, definitionTr stays empty to preserve MyMemory quota.
  const toTranslate = allMeanings.slice(0, 4);
  const translations = await Promise.all(
    toTranslate.map((m) => translateText(m.definitionEn))
  );
  toTranslate.forEach((m, i) => {
    m.definitionTr = translations[i] ?? m.definitionEn;
  });

  // 6. POS heuristic → primary index.
  const primaryMeaningIndex = pickPrimaryIndex(allMeanings, word, sentence);

  // 7. Persist to cache (no-op on Edge / server).
  setCachedTranslation(hash, allMeanings);

  return {
    word,
    meanings: allMeanings,
    primaryMeaningIndex,
    source: 'dictionary',
  };
}

export async function translateSentence(sentence: string): Promise<string> {
  const trimmed = sentence.trim();
  if (!trimmed) return '';

  // Reuse the same cache shape, with a 'sent::' prefix to namespace away
  // from word-level entries.
  const key = 'sent::' + (await hashContext('', trimmed));
  const cached = getCachedTranslation(key);
  if (cached && cached.length > 0 && cached[0].definitionTr) {
    return cached[0].definitionTr;
  }

  const tr = await translateText(trimmed);
  if (!tr) return '';

  setCachedTranslation(key, [
    {
      partOfSpeech: 'phrase',
      definitionEn: trimmed,
      definitionTr: tr,
    },
  ]);
  return tr;
}
