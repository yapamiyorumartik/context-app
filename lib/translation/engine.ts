import {
  getCachedTranslation,
  setCachedTranslation,
} from '@/lib/storage';
import { hashContext } from '@/lib/utils/hash';
import type { PartOfSpeech, WordMeaning } from '@/types';

import { fetchWordDefinition } from './dictionary';
import { pickBestSense } from './lesk';
import { translateLingva } from './lingva';
import { translateText } from './mymemory';
import { guessWordRole } from './pos-heuristic';
import type { TranslationResult } from './types';

/**
 * Race MyMemory and Lingva for short translations. MyMemory rate-limits
 * per IP — once a reading session burns through enough lookups, MyMemory
 * starts returning null and `definitionTr` ends up empty. Racing Lingva
 * means Lingva picks up the slack instead of the popover lying with
 * English text in the Turkish slot.
 */
async function translateBest(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const myMem = translateText(trimmed).then((r) =>
    r ? r : Promise.reject(new Error('mymemory_empty'))
  );
  const lingva = translateLingva(trimmed).then((r) =>
    r ? r : Promise.reject(new Error('lingva_empty'))
  );

  try {
    return await Promise.any([myMem, lingva]);
  } catch {
    return null;
  }
}

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

const TRANSLATE_TOP_N = 4;

export async function translateWord(
  word: string,
  sentence: string
): Promise<TranslationResult> {
  // 1. Cache check (no-op on Edge / server — localStorage is browser-only).
  const hash = await hashContext(word, sentence);
  const cached = getCachedTranslation(hash);
  if (cached && cached.length > 0) {
    const pos = guessWordRole(word, sentence);
    return {
      word,
      meanings: cached,
      primaryMeaningIndex: pickBestSense(word, sentence, cached, pos),
      source: 'dictionary',
    };
  }

  // 2. Fetch dictionary definitions.
  const dict = await fetchWordDefinition(word);

  // 3. Dictionary missing → fall back to single-word translation race.
  if (!dict) {
    const tr = await translateBest(word);
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

  // 5. Compute the best-fit sense BEFORE translating.
  //    We translate a small superset around the chosen sense so the user
  //    can flip to alternates if our pick is wrong, but we burn fewer
  //    MyMemory requests than translating "the first 4 in dictionary order".
  const guessedPos = guessWordRole(word, sentence);
  const primaryIdx = pickBestSense(word, sentence, allMeanings, guessedPos);

  const idxToTranslate = pickIndicesToTranslate(
    allMeanings.length,
    primaryIdx,
    TRANSLATE_TOP_N
  );

  // 6. Translate the chosen subset to Turkish in parallel.
  //    Use translateBest so a MyMemory rate-limit doesn't sabotage the
  //    whole popover — Lingva picks up failed entries.
  const translations = await Promise.all(
    idxToTranslate.map((i) => translateBest(allMeanings[i].definitionEn))
  );
  idxToTranslate.forEach((i, k) => {
    // CRITICAL: leave definitionTr as '' on failure rather than copying
    // English in. Otherwise the popover renders English thinking it's
    // Turkish — the bug that caused "metnin altlarına inince İngilizce
    // çıkmaya başlıyor" once cache + rate-limit kicked in mid-article.
    allMeanings[i].definitionTr = translations[k] ?? '';
  });

  // 7. Persist to cache.
  setCachedTranslation(hash, allMeanings);

  return {
    word,
    meanings: allMeanings,
    primaryMeaningIndex: primaryIdx,
    phonetic: dict.phonetic,
    source: 'dictionary',
  };
}

/**
 * Pick which meaning indices to translate. Always include `primary`,
 * then walk outward (primary-1, primary+1, primary-2, ...) up to `n`.
 * Result is sorted ascending so the popover renders in stable order.
 */
function pickIndicesToTranslate(
  total: number,
  primary: number,
  n: number
): number[] {
  const wanted = Math.min(n, total);
  const picked = new Set<number>([primary]);
  let step = 1;
  while (picked.size < wanted) {
    const before = primary - step;
    const after = primary + step;
    if (before >= 0) picked.add(before);
    if (picked.size >= wanted) break;
    if (after < total) picked.add(after);
    step++;
    if (step > total) break;
  }
  return [...picked].sort((a, b) => a - b);
}

/**
 * Translate a longer text — typically the whole article in the reader.
 *
 * Strategy:
 *   1. Try Lingva (Google-quality, free, key-less) on the whole text in
 *      one shot. This preserves cross-sentence context so pronouns,
 *      idioms, and tone carry through correctly.
 *   2. If Lingva is unreachable, fall back to MyMemory chunked by
 *      paragraph (≤450 chars per request to stay under MyMemory's
 *      practical limit). Within a chunk MyMemory still gets sentence
 *      context, just not cross-paragraph.
 *
 * Both providers are free and do not require an API key — the $0 budget
 * is preserved.
 */
export async function translateLongText(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Race Lingva (whole-text, best quality when up) against MyMemory
  // chunked (always reliable). Whichever returns a non-empty result
  // first wins. Lingva instances are publicly hosted scrapers that go
  // down regularly — racing means Lingva downtime can never stall us.
  const lingvaAttempt = translateLingva(trimmed).then((r) =>
    r ? r : Promise.reject(new Error('lingva_empty'))
  );

  const myMemoryAttempt = (async () => {
    const chunks = chunkForMyMemory(trimmed, 450);
    const parts = await Promise.all(chunks.map((c) => translateText(c)));
    const joined = parts.map((p, i) => p ?? chunks[i]).join('\n\n');
    if (!joined.trim()) throw new Error('mymemory_empty');
    return joined;
  })();

  try {
    return await Promise.any([lingvaAttempt, myMemoryAttempt]);
  } catch {
    return '';
  }
}

/**
 * Split `text` into chunks no larger than `maxChars`, preferring
 * paragraph boundaries, then sentence boundaries.
 */
function chunkForMyMemory(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const out: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      out.push(para);
      continue;
    }
    const sentences = para.split(/(?<=[.!?])\s+/);
    let buf = '';
    for (const s of sentences) {
      if (s.length > maxChars) {
        if (buf) {
          out.push(buf);
          buf = '';
        }
        // Hard-cut a single oversize sentence.
        for (let i = 0; i < s.length; i += maxChars) {
          out.push(s.slice(i, i + maxChars));
        }
        continue;
      }
      if ((buf + ' ' + s).trim().length > maxChars) {
        if (buf) out.push(buf);
        buf = s;
      } else {
        buf = buf ? `${buf} ${s}` : s;
      }
    }
    if (buf) out.push(buf);
  }

  return out;
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

  const tr = await translateBest(trimmed);
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
