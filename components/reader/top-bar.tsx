'use client';

import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import type { ReadingSession } from '@/types';

interface TopBarProps {
  session: ReadingSession;
  onExit: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Kelime yoğun',
};

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: 'border-emerald-300/60 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-300/60 bg-amber-50 text-amber-800',
  hard: 'border-slate-300/60 bg-slate-50 text-slate-700',
};

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  easy: 'Kısa kelimeler, basit cümleler — akıcı okunur',
  medium: 'B1–B2 seviyesi karışık, bilinmeyen kelimeler olabilir',
  hard: 'Akademik/uzun kelimeler yoğun — popover hazır, devam et',
};

/**
 * Heuristic difficulty from text alone — no external word-frequency
 * dataset (we're $0). Combines:
 *   - average word length: a strong proxy for academic/abstract vocab
 *   - long-word ratio (≥7 chars): captures terminology density
 * The blended score lines up well with CEFR perception in spot tests:
 * <5.5 ≈ A2/B1, 5.5–6.5 ≈ B1/B2, >6.5 ≈ B2+/C1.
 */
function calcDifficulty(text: string): Difficulty {
  const words = text.match(/\b[a-zA-Z']+\b/g) ?? [];
  if (words.length === 0) return 'easy';
  let totalLen = 0;
  let longCount = 0;
  for (const w of words) {
    totalLen += w.length;
    if (w.length >= 7) longCount++;
  }
  const avg = totalLen / words.length;
  const longRatio = longCount / words.length;
  const score = avg + longRatio * 4;
  if (score < 5.5) return 'easy';
  if (score < 6.5) return 'medium';
  return 'hard';
}

export function ReadingTopBar({ session, onExit }: TopBarProps) {
  const minutes = Math.max(1, Math.round(session.wordCount / 200));
  const difficulty = useMemo(() => calcDifficulty(session.text), [session.text]);

  return (
    <div className="sticky top-14 z-30 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-12 max-w-[680px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onExit}
          aria-label="New text"
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">New text</span>
        </button>

        <span className="flex-1 truncate font-serif text-sm italic text-muted-foreground">
          {session.title}
        </span>

        <span
          title={DIFFICULTY_HINT[difficulty]}
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            DIFFICULTY_CLASS[difficulty]
          )}
        >
          {DIFFICULTY_LABEL[difficulty]}
        </span>

        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {session.wordCount} words · ~{minutes} min
        </span>
      </div>
    </div>
  );
}
