'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { SAMPLE_TEXT } from '@/lib/data/sample-text';

interface EmptyStateProps {
  onStart: (text: string) => void;
}

const MIN_CHARS = 20;

export function EmptyState({ onStart }: EmptyStateProps) {
  const [text, setText] = useState('');

  const { chars, words } = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [text]);

  const ready = chars >= MIN_CHARS;

  return (
    <div className="mx-auto max-w-[640px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
        Paste your text
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Article, essay, Reddit thread, anything in English.
      </p>

      <div className="mt-6 rounded-lg border border-border/60 bg-card focus-within:border-border focus-within:ring-1 focus-within:ring-border">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste here..."
          className="block min-h-[220px] w-full resize-y rounded-lg bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>
          {chars.toLocaleString()} chars · {words.toLocaleString()} words
        </span>
        <button
          type="button"
          onClick={() => onStart(SAMPLE_TEXT)}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Or try a sample
        </button>
      </div>

      <div className="mt-6">
        <Button
          size="lg"
          disabled={!ready}
          onClick={() => onStart(text)}
        >
          Start Reading
        </Button>
      </div>
    </div>
  );
}
