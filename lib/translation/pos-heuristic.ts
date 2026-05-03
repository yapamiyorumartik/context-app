import nlp from 'compromise';

import type { PartOfSpeech } from '@/types';

/**
 * Lexicon-based POS tagger via compromise.js.
 *
 * Replaces the previous hand-rolled rule set, which mistagged
 * "the mere thought" → noun (the/a/an before X => noun) and similar
 * adjective-after-determiner patterns.
 *
 * Returns a confident guess or null. On null, the engine falls back to
 * the dictionary's natural meaning order.
 */
export function guessWordRole(
  word: string,
  sentence: string
): PartOfSpeech | null {
  if (!word || !sentence) return null;

  const target = word.toLowerCase();

  let doc;
  try {
    doc = nlp(sentence);
  } catch {
    return null;
  }

  const terms = doc.terms().json() as Array<{
    text?: string;
    normal?: string;
    terms?: Array<{ text?: string; normal?: string; tags?: string[] }>;
    tags?: string[];
  }>;

  // compromise's .terms().json() shape varies slightly across versions —
  // flatten defensively so we always end up with { normal, tags } pairs.
  const flat: Array<{ normal: string; tags: string[] }> = [];
  for (const t of terms) {
    if (Array.isArray(t.terms)) {
      for (const sub of t.terms) {
        flat.push({
          normal: (sub.normal ?? sub.text ?? '').toLowerCase(),
          tags: sub.tags ?? [],
        });
      }
    } else {
      flat.push({
        normal: (t.normal ?? t.text ?? '').toLowerCase(),
        tags: t.tags ?? [],
      });
    }
  }

  const hit = flat.find((t) => t.normal === target);
  if (!hit) return null;

  return mapTags(hit.tags);
}

/**
 * Map compromise's tag set to our `PartOfSpeech`.
 *
 * Order matters: compromise can attach multiple tags to one term
 * (e.g. ["Verb", "Gerund"]); we pick the first that maps cleanly.
 */
function mapTags(tags: string[]): PartOfSpeech | null {
  const set = new Set(tags);

  if (set.has('Adverb')) return 'adverb';
  if (set.has('Adjective')) return 'adjective';
  if (
    set.has('Verb') ||
    set.has('Infinitive') ||
    set.has('Gerund') ||
    set.has('PastTense') ||
    set.has('PresentTense') ||
    set.has('Participle')
  ) {
    return 'verb';
  }
  if (
    set.has('Noun') ||
    set.has('Singular') ||
    set.has('Plural') ||
    set.has('ProperNoun')
  ) {
    return 'noun';
  }

  return null;
}
