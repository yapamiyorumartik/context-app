'use client';

import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Check, Lightbulb, SkipForward, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Challenge, ChallengeType } from '@/lib/srs';
import { cn } from '@/lib/utils';
import type { VocabularyEntry } from '@/types';

interface ChallengeCardProps {
  challenge: Challenge;
  pool: readonly VocabularyEntry[];
  onAnswer: (result: { correct: boolean; timeMs: number }) => void;
  onSkip: () => void;
  enableShake?: boolean;
}

type OptionState =
  | 'idle'
  | 'selected-correct'
  | 'selected-wrong'
  | 'reveal-correct'
  | 'disabled';

const CORRECT_AUTO_ADVANCE_MS = 1500;

export function ChallengeCard({
  challenge,
  pool,
  onAnswer,
  onSkip,
  enableShake = true,
}: ChallengeCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const startedAt = useRef(Date.now());
  const advanceTimer = useRef<number | null>(null);
  const shake = useAnimationControls();

  useEffect(() => {
    setSelected(null);
    setHintOpen(false);
    startedAt.current = Date.now();
    return () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    };
  }, [challenge.id]);

  const handlePick = (i: number) => {
    if (selected !== null) return;
    const correct = i === challenge.correctIndex;
    setSelected(i);
    if (correct) {
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        onAnswer({ correct: true, timeMs: Date.now() - startedAt.current });
      }, CORRECT_AUTO_ADVANCE_MS);
    } else if (enableShake) {
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

  const handleSpeak = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(challenge.entry.word);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [challenge.entry.word]);

  const answered = selected !== null;
  const wasWrong = answered && selected !== challenge.correctIndex;
  const example = challenge.entry.selectedMeaning.example?.trim();
  const enDef = challenge.entry.selectedMeaning.definitionEn?.trim();
  const showEnDef =
    answered && enDef && challenge.type !== 'meaning_match';

  const wrongOption =
    wasWrong && selected !== null ? challenge.options[selected] : null;
  const correctInfo = describeCorrect(challenge);
  const wrongInfo = wrongOption
    ? lookupOptionMeaning(wrongOption, challenge.type, pool)
    : null;
  const hintText = useMemo(() => makeHint(challenge), [challenge]);

  return (
    <motion.div animate={shake} className="space-y-5">
      <ChallengeHeader challenge={challenge} answered={answered} />

      {!answered ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2">
          <button
            type="button"
            onClick={() => setHintOpen((v) => !v)}
            aria-expanded={hintOpen}
            className="inline-flex w-full items-center justify-between gap-2 text-left text-[13px] font-medium text-amber-900"
          >
            <span className="inline-flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              {hintOpen ? 'İpucu' : 'İpucu göster'}
            </span>
            <span className="text-[11px] text-amber-700/70">
              {hintOpen ? 'gizle' : 'göster'}
            </span>
          </button>
          {hintOpen ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900/90">
              {hintText}
            </p>
          ) : null}
        </div>
      ) : null}

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

      {wasWrong ? (
        <div className="space-y-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-[14px] leading-relaxed">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Doğrusu
            </div>
            <div className="mt-1">
              <span className="font-serif text-base font-semibold text-foreground">
                {correctInfo.label}
              </span>
              {correctInfo.detail ? (
                <span className="text-muted-foreground"> — {correctInfo.detail}</span>
              ) : null}
            </div>
          </div>
          {wrongInfo ? (
            <div className="border-t border-emerald-200 pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                Senin seçtiğin
              </div>
              <div className="mt-1">
                <span className="font-serif text-base font-semibold text-foreground">
                  {wrongInfo.label}
                </span>
                {wrongInfo.detail ? (
                  <span className="text-muted-foreground"> — {wrongInfo.detail}</span>
                ) : null}
              </div>
            </div>
          ) : null}
          {example ? (
            <div className="border-t border-emerald-200 pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Örnek
              </div>
              <p className="mt-1 font-serif text-[14px] italic leading-relaxed text-muted-foreground">
                {example}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {showEnDef && !wasWrong ? (
        <p className="text-[12px] leading-relaxed text-muted-foreground/90">
          <span className="mr-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/60">
            EN
          </span>
          {enDef}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {!answered ? (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
            aria-label="Skip this word"
          >
            <SkipForward className="h-3.5 w-3.5" /> Skip
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSpeak}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
            aria-label="Pronounce word"
          >
            <Volume2 className="h-3.5 w-3.5" />
            {challenge.entry.phonetic ? (
              <span className="font-mono text-[11px]">
                {challenge.entry.phonetic}
              </span>
            ) : null}
          </button>
        )}

        {wasWrong ? (
          <button
            type="button"
            onClick={handleAdvance}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            <Check className="h-4 w-4" /> Got it
          </button>
        ) : null}
      </div>
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

interface OptionInfo {
  label: string;
  detail?: string;
}

function describeCorrect(challenge: Challenge): OptionInfo {
  const meaningTr =
    challenge.entry.selectedMeaning.definitionTr ||
    challenge.entry.selectedMeaning.definitionEn;
  switch (challenge.type) {
    case 'meaning_match':
      return { label: meaningTr };
    case 'fill_blank':
    case 'reverse_recall':
      return { label: challenge.entry.word, detail: meaningTr };
  }
}

function lookupOptionMeaning(
  text: string,
  type: ChallengeType,
  pool: readonly VocabularyEntry[]
): OptionInfo | null {
  if (type === 'meaning_match') {
    const entry = pool.find(
      (v) =>
        (v.selectedMeaning.definitionTr ||
          v.selectedMeaning.definitionEn) === text
    );
    if (!entry) return { label: text };
    return { label: text, detail: `(${entry.word})` };
  }
  const lower = text.toLowerCase();
  const entry = pool.find((v) => v.lemma === lower);
  if (!entry) return { label: text };
  return {
    label: text,
    detail:
      entry.selectedMeaning.definitionTr ||
      entry.selectedMeaning.definitionEn,
  };
}

function makeHint(challenge: Challenge): string {
  const pos = challenge.entry.selectedMeaning.partOfSpeech;
  const posTr = posToTr(pos);
  switch (challenge.type) {
    case 'meaning_match':
      return `Bu kullanımda kelime ${posTr}.`;
    case 'fill_blank': {
      const w = challenge.word;
      const initial = w.charAt(0);
      return `${posTr.charAt(0).toUpperCase() + posTr.slice(1)}, ${w.length} harf, "${initial}…" ile başlıyor.`;
    }
    case 'reverse_recall': {
      const w = challenge.entry.word;
      const initial = w.charAt(0);
      return `${posTr.charAt(0).toUpperCase() + posTr.slice(1)}, ${w.length} harf, "${initial}…" ile başlıyor.`;
    }
  }
}

function posToTr(pos: string): string {
  switch (pos) {
    case 'noun':
      return 'isim';
    case 'verb':
      return 'fiil';
    case 'adjective':
      return 'sıfat';
    case 'adverb':
      return 'zarf';
    case 'phrase':
      return 'kalıp ifade';
    default:
      return 'kelime';
  }
}

function ChallengeHeader({
  challenge,
  answered,
}: {
  challenge: Challenge;
  answered: boolean;
}) {
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
          {answered ? (
            <Sentence
              text={challenge.sentenceWithBlank.replace(/____/, challenge.word)}
              highlight={challenge.word}
            />
          ) : (
            <Sentence
              text={challenge.sentenceWithBlank}
              highlight="____"
            />
          )}
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
            <AnimatePresence>
              {answered ? (
                <motion.div
                  key="ctx"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 border-t border-border/40 pt-3">
                    <Sentence
                      text={challenge.contextSentence}
                      highlight={challenge.entry.word}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
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
