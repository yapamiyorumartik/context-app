'use client';

import { useEffect, useMemo, useRef } from 'react';

import { useReaderStore } from '@/lib/reader/store';
import { useVocabularyStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import {
  getSentenceText,
  tokenizeParagraph,
  type Token,
} from '@/lib/utils/tokenize';
import type { ReadingFontSize } from '@/types';

/**
 * Per-saved-word state used for color-coded underlines in the reader.
 * - `saved`: in user's vocabulary, not yet due for review
 * - `due`:   `nextReviewAt` has passed — gentle nudge to notice it again
 * - `overdue`: due > 3 days ago — stronger visual cue
 */
export type SavedLemmaState = 'saved' | 'due' | 'overdue';

interface ArticleProps {
  text: string;
  /** Lemmas (lowercase) → underline state. Lemmas not in the map render plain. */
  savedLemmas: ReadonlyMap<string, SavedLemmaState>;
}

const FONT_PX: Record<ReadingFontSize, string> = {
  sm: '17px',
  md: '19px',
  lg: '22px',
};

export function Article({ text, savedLemmas }: ArticleProps) {
  const articleRef = useRef<HTMLElement>(null);
  const showPopover = useReaderStore((s) => s.showPopover);
  const fontSize = useVocabularyStore(
    (s) => s.settings.readingFontSize ?? 'md'
  );

  const paragraphs = useMemo(
    () =>
      text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    [text]
  );

  // Phrase selection: when the user drag-selects (desktop) or long-presses
  // to select (mobile) 2+ words inside the article, open the popover with
  // the selected text as a phrase lookup.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onSelectionChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        const articleEl = articleRef.current;
        if (!articleEl) return;
        if (
          !articleEl.contains(range.startContainer) ||
          !articleEl.contains(range.endContainer)
        ) {
          return;
        }

        const text = sel.toString().trim();
        if (!text) return;
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length < 2) return;

        const rects = range.getClientRects();
        const last = rects[rects.length - 1];
        if (!last) return;

        showPopover({
          mode: 'phrase',
          word: text,
          sentence: text,
          rect: {
            top: last.bottom,
            left: last.right,
            width: 0,
            height: 0,
          },
        });
      }, 250);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (timer) clearTimeout(timer);
    };
  }, [showPopover]);

  return (
    <article
      ref={articleRef}
      className="mx-auto max-w-[680px] px-4 pb-32 pt-8 sm:px-6"
      style={{ ['--reader-font-size' as string]: FONT_PX[fontSize] }}
    >
      {paragraphs.map((p, idx) => (
        <Paragraph
          key={idx}
          text={p}
          paragraphIdx={idx}
          savedLemmas={savedLemmas}
        />
      ))}
    </article>
  );
}

interface ParagraphProps {
  text: string;
  paragraphIdx: number;
  savedLemmas: ReadonlyMap<string, SavedLemmaState>;
}

function Paragraph({ text, paragraphIdx, savedLemmas }: ParagraphProps) {
  const tokens = useMemo(() => tokenizeParagraph(text), [text]);

  return (
    <p
      className="font-serif leading-[1.75] text-[#2A2A2A]"
      style={{
        fontSize: 'var(--reader-font-size, 19px)',
        marginBottom: '1.5em',
      }}
    >
      {tokens.map((t, i) => (
        <TokenSpan
          key={i}
          token={t}
          tokens={tokens}
          paragraphIdx={paragraphIdx}
          savedLemmas={savedLemmas}
        />
      ))}
    </p>
  );
}

interface TokenSpanProps {
  token: Token;
  tokens: Token[];
  paragraphIdx: number;
  savedLemmas: ReadonlyMap<string, SavedLemmaState>;
}

const SAVED_UNDERLINE_CLASS: Record<SavedLemmaState, string> = {
  saved:
    'underline decoration-dotted decoration-gray-300 underline-offset-4',
  due:
    'underline decoration-dotted decoration-amber-500/80 underline-offset-4',
  overdue:
    'underline decoration-dotted decoration-rose-500/90 underline-offset-4',
};

const SAVED_LABEL: Record<SavedLemmaState, string> = {
  saved: 'Kaydedildi',
  due: 'Tekrar zamanı',
  overdue: 'Gecikmiş tekrar',
};

function TokenSpan({
  token,
  tokens,
  paragraphIdx,
  savedLemmas,
}: TokenSpanProps) {
  const showPopover = useReaderStore((s) => s.showPopover);
  const setSelectedToken = useReaderStore((s) => s.setSelectedToken);

  if (token.type !== 'word') {
    return <>{token.text}</>;
  }

  const savedState = savedLemmas.get(token.text.toLowerCase());

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().split(/\s+/).length > 1) {
      // The selection handler already opened a phrase popover — don't override.
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const sentence = getSentenceText(tokens, token.sentenceIdx);
    setSelectedToken({
      word: token.text,
      sentence,
      paragraphIdx,
      sentenceIdx: token.sentenceIdx,
    });
    showPopover({
      mode: 'word',
      word: token.text,
      sentence,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  return (
    <span
      data-word={token.text}
      data-sentence-idx={token.sentenceIdx}
      data-paragraph-idx={paragraphIdx}
      onClick={handleClick}
      title={savedState ? SAVED_LABEL[savedState] : undefined}
      className={cn(
        'cursor-pointer rounded-sm px-px py-0.5 transition-colors hover:bg-slate-200/60',
        savedState && SAVED_UNDERLINE_CLASS[savedState]
      )}
    >
      {token.text}
    </span>
  );
}
