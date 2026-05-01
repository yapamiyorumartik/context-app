import type { WordMeaning } from '@/types';

export interface TranslationResult {
  word: string;
  /** All available meanings, in display order. */
  meanings: WordMeaning[];
  /** Best guess based on POS heuristic over the surrounding sentence. */
  primaryMeaningIndex: number;
  source: 'dictionary' | 'translate' | 'fallback';
}
