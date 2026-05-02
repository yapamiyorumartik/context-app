'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import {
  getSentenceText,
  tokenizeParagraph,
  type Token,
} from '@/lib/utils/tokenize';

export interface WordTapInfo {
  word: string;
  sentence: string;
  paragraphIdx: number;
  sentenceIdx: number;
}

interface ArticleProps {
  text: string;
  /** Lemmas (lowercase) that should render with a saved-word underline. */
  savedLemmas: Set<string>;
  onWordClick: (info: WordTapInfo) => void;
}

export function Article({ text, savedLemmas, onWordClick }: ArticleProps) {
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    [text]
  );

  return (
    <article className="mx-auto max-w-[680px] px-4 pb-32 pt-8 sm:px-6">
      {paragraphs.map((p, idx) => (
        <Paragraph
          key={idx}
          text={p}
          paragraphIdx={idx}
          savedLemmas={savedLemmas}
          onWordClick={onWordClick}
        />
      ))}
    </article>
  );
}

interface ParagraphProps {
  text: string;
  paragraphIdx: number;
  savedLemmas: Set<string>;
  onWordClick: (info: WordTapInfo) => void;
}

function Paragraph({
  text,
  paragraphIdx,
  savedLemmas,
  onWordClick,
}: ParagraphProps) {
  const tokens = useMemo(() => tokenizeParagraph(text), [text]);

  return (
    <p
      className="font-serif text-[19px] leading-[1.75] text-[#2A2A2A]"
      style={{ marginBottom: '1.5em' }}
    >
      {tokens.map((t, i) => (
        <TokenSpan
          key={i}
          token={t}
          tokens={tokens}
          paragraphIdx={paragraphIdx}
          savedLemmas={savedLemmas}
          onWordClick={onWordClick}
        />
      ))}
    </p>
  );
}

interface TokenSpanProps {
  token: Token;
  tokens: Token[];
  paragraphIdx: number;
  savedLemmas: Set<string>;
  onWordClick: (info: WordTapInfo) => void;
}

function TokenSpan({
  token,
  tokens,
  paragraphIdx,
  savedLemmas,
  onWordClick,
}: TokenSpanProps) {
  if (token.type !== 'word') {
    return <>{token.text}</>;
  }

  const isSaved = savedLemmas.has(token.text.toLowerCase());

  return (
    <span
      data-word={token.text}
      data-sentence-idx={token.sentenceIdx}
      data-paragraph-idx={paragraphIdx}
      onClick={() =>
        onWordClick({
          word: token.text,
          sentence: getSentenceText(tokens, token.sentenceIdx),
          paragraphIdx,
          sentenceIdx: token.sentenceIdx,
        })
      }
      className={cn(
        'cursor-pointer rounded-sm px-px py-0.5 transition-colors hover:bg-slate-200/60',
        isSaved &&
          'underline decoration-dotted decoration-gray-300 underline-offset-4'
      )}
    >
      {token.text}
    </span>
  );
}
