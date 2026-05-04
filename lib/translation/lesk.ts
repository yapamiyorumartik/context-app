import type { PartOfSpeech, WordMeaning } from '@/types';

/**
 * Simplified Lesk algorithm for word-sense disambiguation.
 *
 * Given a target word, its sentence, and a list of candidate meanings
 * (each with an English definition and optional example), return the
 * index of the meaning whose definition + example most overlaps with
 * the sentence's content words.
 *
 * Why: dictionary order is wrong for polysemous words. e.g. for "mere"
 * in "the mere thought of an open relationship", the noun sense (a small
 * lake) outranks the adjective sense (nothing more than) in raw dict
 * order, but a context overlap check picks the adjective.
 *
 * If no candidate scores higher than the others, returns the result of
 * the secondary tiebreaker (POS match), then falls back to 0.
 */
export function pickBestSense(
  word: string,
  sentence: string,
  meanings: WordMeaning[],
  preferredPos: PartOfSpeech | null
): number {
  if (meanings.length === 0) return 0;
  if (meanings.length === 1) return 0;

  const contextBag = bagOfWords(sentence, word);

  let bestIdx = 0;
  let bestScore = -1;
  let posBonusFallback = -1;

  for (let i = 0; i < meanings.length; i++) {
    const m = meanings[i];
    const senseBag = bagOfWords(
      `${m.definitionEn} ${m.example ?? ''}`,
      ''
    );
    const overlap = countOverlap(contextBag, senseBag);

    let score = overlap;
    if (preferredPos && m.partOfSpeech === preferredPos) {
      score += 0.5; // tie-break in favour of the POS-matched sense
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    } else if (score === bestScore) {
      // Tiebreak by definition length: shorter = more basic/common meaning.
      // e.g. "A generally accepted means of exchange" wins over a long
      // technical economics definition for "money" when context gives no
      // overlap signal.
      if (m.definitionEn.length < meanings[bestIdx].definitionEn.length) {
        bestIdx = i;
      }
    }

    // Track first POS-matched index in case overlap is uniformly zero.
    if (
      posBonusFallback === -1 &&
      preferredPos &&
      m.partOfSpeech === preferredPos
    ) {
      posBonusFallback = i;
    }
  }

  // All scores zero → no contextual signal at all → trust POS only.
  if (bestScore <= 0 && posBonusFallback !== -1) {
    return posBonusFallback;
  }

  return bestIdx;
}

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','am',
  'do','does','did','have','has','had','will','would','can','could',
  'should','may','might','must','shall',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their','this','that','these','those',
  'and','or','but','if','then','than','so','as','of','to','in','on',
  'at','by','for','with','from','into','about','over','under',
  'not','no','yes','also','too','very','just','only','here','there',
  'what','which','who','whom','whose','when','where','why','how',
]);

function bagOfWords(text: string, exclude: string): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const excluded = exclude.toLowerCase();
  const tokens = text.toLowerCase().match(/[a-z']+/g) ?? [];
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (t === excluded) continue;
    if (STOP_WORDS.has(t)) continue;
    out.add(t);
  }
  return out;
}

function countOverlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) {
    if (b.has(x)) n++;
  }
  return n;
}
