'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Challenge } from '@/lib/srs';
import { cn } from '@/lib/utils';

interface ChallengeCardProps {
  challenge: Challenge;
  onAnswer: (result: { correct: boolean; timeMs: number }) => void;
}

type OptionState =
  | 'idle'
  | 'selected-correct'
  | 'selected-wrong'
  | 'reveal-correct'
  | 'disabled';

export function ChallengeCard({ challenge, onAnswer }: ChallengeCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const startedAt = useRef(Date.now());
  const shake = useAnimationControls();

  // Reset state when the challenge changes (in case a single instance
  // gets reused — but the page also remounts via key).
  useEffect(() => {
    setSelected(null);
    startedAt.current = Date.now();
  }, [challenge.id]);

  const handlePick = (i: number) => {
    if (selected !== null) return;
    const correct = i === challenge.correctIndex;
    setSelected(i);
    if (correct) {
      window.setTimeout(() => {
        onAnswer({ correct: true, timeMs: Date.now() - startedAt.current });
      }, 400);
    } else {
      shake.start({
        x: [0, -8, 8, -4, 4, 0],
        transition: { duration: 0.35, ease: 'easeInOut' },
      });
    }
  };

  const handleAdvance = () => {
    if (selected === null) return;
    onAnswer({
      correct: selected === challenge.correctIndex,
      timeMs: Date.now() - startedAt.current,
    });
  };

  const showAdvance =
    selected !== null && selected !== challenge.correctIndex;

  return (
    <motion.div animate={shake} className="space-y-5">
      <ChallengeHeader challenge={challenge} />

      <ul className="space-y-2">
        {challenge.options.map((opt, i) => {
          const state = optionState(i, selected, challenge.correctIndex);
          return (
            <li key={i}>
              <OptionButton
                label={opt}
                state={state}
                onClick={() => handlePick(i)}
              />
            </li>
          );
        })}
      </ul>

      {showAdvance ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdvance}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            <Check className="h-4 w-4" /> Got it
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

function optionState(
  i: number,
  selected: number | null,
  correctIndex: number
): OptionState {
  if (selected === null) return 'idle';
  if (i === selected) {
    return i === correctIndex ? 'selected-correct' : 'selected-wrong';
  }
  if (i === correctIndex && selected !== correctIndex) return 'reveal-correct';
  return 'disabled';
}

// ─── Sub-views ──────────────────────────────────────────────────────────────

function ChallengeHeader({ challenge }: { challenge: Challenge }) {
  switch (challenge.type) {
    case 'meaning_match':
      return (
        <div className="space-y-3">
          <Question>
            What does <Em>{challenge.word}</Em> mean here?
          </Question>
          <Sentence text={challenge.sentence} highlight={challenge.word} />
        </div>
      );
    case 'fill_blank':
      return (
        <div className="space-y-3">
          <Question>Fill the blank:</Question>
          <Sentence text={challenge.sentenceWithBlank} highlight="____" />
        </div>
      );
    case 'reverse_recall':
      return (
        <div className="space-y-3">
          <Question>Which English word means this?</Question>
          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="font-serif text-lg leading-snug text-foreground">
              {challenge.meaning}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {challenge.partOfSpeech}
            </div>
          </div>
        </div>
      );
  }
}

function Question({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-base text-foreground sm:text-lg">{children}</p>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <strong className="font-serif font-medium">{children}</strong>;
}

function Sentence({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}) {
  const parts = useMemo(() => splitWithHighlight(text, highlight), [
    text,
    highlight,
  ]);
  return (
    <p className="font-serif text-[17px] leading-relaxed text-[#2A2A2A]">
      {parts.map((p, i) =>
        p.match ? (
          <strong key={i} className="font-medium text-foreground">
            {p.text}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}

function splitWithHighlight(
  text: string,
  highlight: string
): { text: string; match: boolean }[] {
  if (!highlight) return [{ text, match: false }];
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  const tokens = text.split(re);
  const lower = highlight.toLowerCase();
  return tokens
    .filter((t) => t.length > 0)
    .map((t) => ({ text: t, match: t.toLowerCase() === lower }));
}

interface OptionButtonProps {
  label: string;
  state: OptionState;
  onClick: () => void;
}

function OptionButton({ label, state, onClick }: OptionButtonProps) {
  const styles: Record<OptionState, string> = {
    idle: 'border-border/60 bg-card hover:border-foreground/40',
    'selected-correct':
      'border-emerald-500 bg-emerald-50 text-emerald-900',
    'reveal-correct':
      'border-emerald-500 bg-emerald-50 text-emerald-900',
    'selected-wrong': 'border-rose-300 bg-rose-50 text-rose-900',
    disabled: 'border-border/40 bg-card text-muted-foreground opacity-70',
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={state === 'disabled' || state === 'reveal-correct'}
      animate={
        state === 'selected-correct' ? { scale: [1, 1.04, 1] } : { scale: 1 }
      }
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex min-h-[56px] w-full items-center rounded-lg border px-4 py-3 text-left text-[15px] transition-colors',
        styles[state]
      )}
    >
      {(state === 'selected-correct' || state === 'reveal-correct') && (
        <Check className="mr-2 h-4 w-4 shrink-0 text-emerald-600" />
      )}
      <span className="flex-1">{label}</span>
    </motion.button>
  );
}
