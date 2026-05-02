export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'phrase'
  | 'other';

export interface WordMeaning {
  partOfSpeech: PartOfSpeech;
  /** English definition from dictionary. */
  definitionEn: string;
  /** Turkish translation of that definition. */
  definitionTr: string;
  /** Example sentence if available. */
  example?: string;
}

export interface VocabularyEntry {
  /** crypto.randomUUID() */
  id: string;
  /** original cased word, e.g. "Address" */
  word: string;
  /** lowercase base, e.g. "address" */
  lemma: string;
  /** the FULL sentence the word came from */
  contextSentence: string;
  /** which meaning the user picked */
  selectedMeaning: WordMeaning;
  /** all meanings we showed them */
  allMeanings: WordMeaning[];
  /** optional link to a reading_session */
  sourceSessionId?: string;
  /** Date.now() */
  createdAt: number;
  // SRS fields
  /** default 2.5 */
  easeFactor: number;
  /** default 1 */
  intervalDays: number;
  /** timestamp */
  nextReviewAt: number;
  reviewCount: number;
  correctCount: number;
  lastReviewedAt?: number;
}

export interface ReadingSession {
  id: string;
  /** first 6 words of the text, or user-provided */
  title: string;
  /** full pasted text */
  text: string;
  createdAt: number;
  wordCount: number;
}

export type ReadingFontSize = 'sm' | 'md' | 'lg';

export interface AppSettings {
  hasSeenOnboarding: boolean;
  /** "Tap any word" tip on the reader — separate from landing skip. */
  hasSeenReaderTip?: boolean;
  reviewStreak: number;
  /** YYYY-MM-DD */
  lastReviewDate?: string;
  totalWordsReviewed: number;
  /** Date.now() of the most recent successful export. */
  lastExportedAt?: number;
  readingFontSize?: ReadingFontSize;
}
