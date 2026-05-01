import type { PartOfSpeech } from '@/types';

/**
 * Lightweight contextual POS guesser. Pure-function rules, no NLP libs.
 * Returns a confident guess or `null`. Caller should fall back to the
 * dictionary's natural meaning order on null.
 */

const DETERMINERS = new Set([
  'the',
  'a',
  'an',
  'his',
  'her',
  'this',
]);

const MODAL_AUX = new Set([
  'will',
  'can',
  'must',
  'should',
  'would',
  'may',
  'might',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'being',
  'been',
]);

const INTENSIFIERS = new Set(['very', 'quite', 'really', 'so']);

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z']+/g) ?? [];
}

export function guessWordRole(
  word: string,
  sentence: string
): PartOfSpeech | null {
  const target = word.toLowerCase();
  const tokens = tokenize(sentence);
  const idx = tokens.indexOf(target);
  if (idx === -1) return null;

  const prev = idx > 0 ? tokens[idx - 1] : null;
  const next = idx < tokens.length - 1 ? tokens[idx + 1] : null;
  const isFirst = idx === 0;

  // Highest confidence: infinitive marker.
  if (prev === 'to') return 'verb';

  // Determiner / possessive immediately before → noun.
  if (prev !== null && DETERMINERS.has(prev)) return 'noun';

  // Modal or auxiliary immediately before → main verb.
  if (prev !== null && MODAL_AUX.has(prev)) return 'verb';

  // Intensifier immediately before → adjective (most common case).
  if (prev !== null && INTENSIFIERS.has(prev)) return 'adjective';

  // Imperative pattern: sentence-initial, followed by a determiner-led NP.
  if (isFirst && next !== null && DETERMINERS.has(next)) return 'verb';

  // Suffix-based fallback (least confident).
  if (target.endsWith('ly') && target.length > 3) return 'adverb';
  if (target.endsWith('ing') && target.length > 4) return 'verb';
  if (target.endsWith('ed') && target.length > 3) return 'verb';

  return null;
}
