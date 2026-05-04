import { DISTRACTOR_POOL } from '@/lib/data/distractor-pool';
import type { PartOfSpeech, VocabularyEntry } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChallengeType =
  | 'meaning_match'
  | 'fill_blank'
  | 'reverse_recall';

interface BaseChallenge {
  /** Unique ID generated per session — used as a React key for transitions. */
  id: string;
  type: ChallengeType;
  entry: VocabularyEntry;
  options: string[];
  correctIndex: number;
}

export interface MeaningMatchChallenge extends BaseChallenge {
  type: 'meaning_match';
  word: string;
  sentence: string;
}

export interface FillBlankChallenge extends BaseChallenge {
  type: 'fill_blank';
  word: string;
  sentenceWithBlank: string;
}

export interface ReverseRecallChallenge extends BaseChallenge {
  type: 'reverse_recall';
  meaning: string;
  partOfSpeech: PartOfSpeech;
  /** Sentence to reveal *after* the user answers (the word is highlighted). */
  contextSentence: string;
}

export type Challenge =
  | MeaningMatchChallenge
  | FillBlankChallenge
  | ReverseRecallChallenge;

// ─── Weights ────────────────────────────────────────────────────────────────

// `context_match` retired — its distractors were sentences from unrelated
// vocabulary entries (none of which contained the target word), making the
// answer trivial and the question unteaching. Weight redistributed.
const WEIGHTS: Record<ChallengeType, number> = {
  meaning_match: 55,
  fill_blank: 20,
  reverse_recall: 25,
};

const MULTI_WORD_MIN_POOL = 4;

// ─── Helpers ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Walk through `source` (already shuffled by caller) and pick the first `n`
 * items whose key isn't in `seen` yet. Adds picked keys to `seen`.
 */
function takeUnique<T>(
  source: readonly T[],
  n: number,
  seen: Set<string>,
  key: (t: T) => string
): T[] {
  const out: T[] = [];
  for (const item of source) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= n) break;
  }
  return out;
}

function meaningOf(entry: VocabularyEntry): string {
  return (
    entry.selectedMeaning.definitionTr || entry.selectedMeaning.definitionEn
  );
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

// ─── Type picker ────────────────────────────────────────────────────────────

/** Soft-prefer not repeating a type already used in this session. */
function pickType(canUseMulti: boolean, used: ChallengeType[]): ChallengeType {
  const available: ChallengeType[] = canUseMulti
    ? ['meaning_match', 'fill_blank', 'reverse_recall']
    : ['meaning_match'];

  const weights = available.map((t) => {
    const used_n = used.filter((u) => u === t).length;
    return WEIGHTS[t] / (1 + used_n);
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r <= 0) return available[i];
  }
  return available[available.length - 1];
}

// ─── Generators ─────────────────────────────────────────────────────────────

function generateMeaningMatch(
  entry: VocabularyEntry,
  pool: readonly VocabularyEntry[],
  contextSentence: string = entry.contextSentence
): MeaningMatchChallenge {
  const correct = meaningOf(entry);
  const seen = new Set<string>([correct.toLowerCase()]);

  const candidatesFromVocab = shuffle(
    pool.filter((v) => v.id !== entry.id).map(meaningOf)
  );
  const fromVocab = takeUnique(candidatesFromVocab, 3, seen, (s) =>
    s.toLowerCase()
  );

  const remaining = 3 - fromVocab.length;
  const fromPool =
    remaining > 0
      ? takeUnique(shuffle(DISTRACTOR_POOL), remaining, seen, (s) =>
          s.toLowerCase()
        )
      : [];

  const options = shuffle([correct, ...fromVocab, ...fromPool]);
  return {
    id: newId(),
    type: 'meaning_match',
    entry,
    word: entry.word,
    sentence: contextSentence,
    options,
    correctIndex: options.indexOf(correct),
  };
}

function generateFillBlank(
  entry: VocabularyEntry,
  pool: readonly VocabularyEntry[],
  contextSentence: string = entry.contextSentence
): FillBlankChallenge {
  const re = new RegExp(`\\b${escapeRegex(entry.word)}\\b`, 'i');
  const sentenceWithBlank = re.test(contextSentence)
    ? contextSentence.replace(re, '____')
    : `${contextSentence} (____)`;

  const correct = entry.word;
  const targetPos = entry.selectedMeaning.partOfSpeech;
  const seen = new Set<string>([correct.toLowerCase()]);

  // Prefer same-POS distractors so the question actually tests meaning,
  // not part-of-speech. Fall back to other-POS only if same-POS pool is thin.
  const samePos = pool.filter(
    (v) => v.id !== entry.id && v.selectedMeaning.partOfSpeech === targetPos
  );
  const otherPos = pool.filter(
    (v) => v.id !== entry.id && v.selectedMeaning.partOfSpeech !== targetPos
  );
  const ranked = [...shuffle(samePos), ...shuffle(otherPos)];
  const distractors = takeUnique(
    ranked.map((v) => v.word),
    3,
    seen,
    (s) => s.toLowerCase()
  );

  const options = shuffle([correct, ...distractors]);
  return {
    id: newId(),
    type: 'fill_blank',
    entry,
    word: entry.word,
    sentenceWithBlank,
    options,
    correctIndex: options.indexOf(correct),
  };
}

function generateReverseRecall(
  entry: VocabularyEntry,
  pool: readonly VocabularyEntry[],
  contextSentence: string = entry.contextSentence
): ReverseRecallChallenge {
  const correct = entry.word;
  const targetPos = entry.selectedMeaning.partOfSpeech;

  const samePos = pool.filter(
    (v) =>
      v.id !== entry.id && v.selectedMeaning.partOfSpeech === targetPos
  );
  const otherPos = pool.filter(
    (v) =>
      v.id !== entry.id && v.selectedMeaning.partOfSpeech !== targetPos
  );

  const seen = new Set<string>([correct.toLowerCase()]);
  const ranked = [...shuffle(samePos), ...shuffle(otherPos)];
  const distractors = takeUnique(
    ranked.map((v) => v.word),
    3,
    seen,
    (s) => s.toLowerCase()
  );

  const options = shuffle([correct, ...distractors]);
  return {
    id: newId(),
    type: 'reverse_recall',
    entry,
    meaning: meaningOf(entry),
    partOfSpeech: targetPos,
    contextSentence,
    options,
    correctIndex: options.indexOf(correct),
  };
}

// ─── Main entry point ───────────────────────────────────────────────────────

export interface BuildChallengesOptions {
  /**
   * If true, use `entry.selectedMeaning.example` as the context sentence
   * (when available) instead of the original `entry.contextSentence`.
   * This is how the retry wave reinforces a word: same word, fresh context.
   * Falls back silently to `contextSentence` when no example is recorded.
   */
  useExampleSentence?: boolean;
}

/**
 * Build a list of challenges (one per batch entry).
 * `pool` is the full vocabulary, used to source distractors.
 */
export function buildChallenges(
  batch: readonly VocabularyEntry[],
  pool: readonly VocabularyEntry[],
  options: BuildChallengesOptions = {}
): Challenge[] {
  const canUseMulti = pool.length >= MULTI_WORD_MIN_POOL;
  const used: ChallengeType[] = [];

  return batch.map((entry) => {
    const ctx = sentenceFor(entry, options);
    const type = pickType(canUseMulti, used);
    used.push(type);
    switch (type) {
      case 'meaning_match':
        return generateMeaningMatch(entry, pool, ctx);
      case 'fill_blank':
        return generateFillBlank(entry, pool, ctx);
      case 'reverse_recall':
        return generateReverseRecall(entry, pool, ctx);
    }
  });
}

/**
 * Pick the sentence to use for a given entry.
 *
 * Goal: don't always quiz the user with the SAME sentence they originally
 * saved the word from — recognition in the original context is shallow
 * memory ("I remember this paragraph"), not real word knowledge. By the
 * 2nd–3rd review we should be testing the word in a fresh sentence so
 * the user has to recover meaning from the word itself.
 *
 * Strategy:
 *   - Build a small pool of usable sentences for this word
 *     (original context + dictionary example, when valid)
 *   - Rotate by `reviewCount` so consecutive reviews see different sentences
 *   - In the retry wave (`useExampleSentence`), strongly prefer the
 *     example sentence — it's specifically meant to reinforce after a miss
 *
 * If only one usable sentence exists, we just return it.
 */
function sentenceFor(
  entry: VocabularyEntry,
  options: BuildChallengesOptions
): string {
  const pool = sentencePool(entry);
  if (pool.length === 1) return pool[0];

  if (options.useExampleSentence) {
    // Retry wave: pick the first non-context sentence (i.e. the example).
    const fresh = pool.find((s) => s !== entry.contextSentence);
    return fresh ?? pool[0];
  }

  // Main batch: rotate by reviewCount so reviews 0, 1, 2, ... see
  // different sentences. New words (reviewCount=0) start with the
  // original context (familiar foothold), then drift to the example.
  const idx = entry.reviewCount % pool.length;
  return pool[idx];
}

function sentencePool(entry: VocabularyEntry): string[] {
  const pool: string[] = [entry.contextSentence];
  const example = entry.selectedMeaning.example?.trim();
  if (
    example &&
    example !== entry.contextSentence &&
    new RegExp(`\\b${escapeRegex(entry.word)}\\b`, 'i').test(example)
  ) {
    pool.push(example);
  }
  return pool;
}
