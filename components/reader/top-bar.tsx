'use client';

import { ArrowLeft } from 'lucide-react';

import type { ReadingSession } from '@/types';

interface TopBarProps {
  session: ReadingSession;
  onExit: () => void;
}

export function ReadingTopBar({ session, onExit }: TopBarProps) {
  const minutes = Math.max(1, Math.round(session.wordCount / 200));

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

        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {session.wordCount} words · ~{minutes} min
        </span>
      </div>
    </div>
  );
}
