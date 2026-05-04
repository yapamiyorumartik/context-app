'use client';

import { motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  GripHorizontal,
  Plus,
  RotateCcw,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  useReaderStore,
  type ActivePopover,
} from '@/lib/reader/store';
import { useVocabularyStore } from '@/lib/storage/store';
import type { TranslationResult } from '@/lib/translation/types';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils/relative-time';
import type { VocabularyEntry, WordMeaning } from '@/types';

const POPOVER_W = 328;

export function TranslationPopoverHost() {
  const active = useReaderStore((s) => s.activePopover);
  const hide = useReaderStore((s) => s.hidePopover);

  if (!active || typeof window === 'undefined') return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ESTIMATED_H = 320;
  const initialX = Math.max(8, Math.min(active.rect.left, vw - POPOVER_W - 8));
  // Prefer above the word (like Radix default). Fall back to below if no room.
  const rectBottom = active.rect.top + active.rect.height;
  const spaceAbove = active.rect.top - 8;
  const spaceBelow = vh - rectBottom - 8;
  const initialY =
    spaceAbove >= ESTIMATED_H || spaceAbove >= spaceBelow
      ? Math.max(8, active.rect.top - ESTIMATED_H)
      : rectBottom + 8;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={hide}
      />
      <motion.div
        key={`${active.word}::${active.sentence}`}
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: 8, top: 8, right: vw - POPOVER_W - 8, bottom: vh - 120 }}
        initial={{ x: initialX, y: initialY, opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: POPOVER_W,
          zIndex: 50,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex cursor-grab items-center justify-center py-1.5 active:cursor-grabbing">
          <GripHorizontal className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <div className="overflow-y-auto px-4 pb-4">
          <PopoverBody data={active} onClose={hide} />
        </div>
      </motion.div>
    </>,
    document.body
  );
}

// ─── Popover body ─────────────────────────────────────────────────────────────

interface PopoverBodyProps {
  data: ActivePopover;
  onClose: () => void;
}

function PopoverBody({ data, onClose }: PopoverBodyProps) {
  const sessionId = useReaderStore((s) => s.currentSession?.id);
  const addSavedWordId = useReaderStore((s) => s.addSavedWordId);
  const showToast = useReaderStore((s) => s.showToast);

  const vocabulary = useVocabularyStore((s) => s.vocabulary);
  const addWord = useVocabularyStore((s) => s.addWord);
  const removeWord = useVocabularyStore((s) => s.removeWord);

  const existingEntry = useMemo<VocabularyEntry | null>(() => {
    if (data.mode !== 'word') return null;
    const lemma = data.word.toLowerCase();
    return vocabulary.find((v) => v.lemma === lemma) ?? null;
  }, [vocabulary, data.word, data.mode]);

  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sentenceTr, setSentenceTr] = useState<string | null>(null);

  // Sentence-level contextual translation (parallel, for display + auto-select).
  useEffect(() => {
    if (data.mode !== 'word' || !data.sentence) return;
    setSentenceTr(null);
    const controller = new AbortController();
    fetch('/api/translate/sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence: data.sentence }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { translation?: string } | null) => {
        const tr = j?.translation?.trim();
        if (tr) setSentenceTr(tr);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [data.word, data.sentence, data.mode, retry]);

  // Auto-select best meaning using Turkish sentence overlap.
  // Runs after both sentenceTr and result are loaded.
  useEffect(() => {
    if (!sentenceTr || !result || result.meanings.length <= 1) return;
    const sBag = trBag(sentenceTr);
    let bestIdx = 0;
    let bestScore = -1;
    result.meanings.forEach((m, i) => {
      const mBag = trBag(m.definitionTr || m.definitionEn);
      let score = 0;
      for (const w of mBag) if (sBag.has(w)) score++;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    if (bestScore > 0) setSelectedIdx(bestIdx);
  }, [sentenceTr, result]);

  // Fetch word/phrase translation.
  useEffect(() => {
    if (existingEntry) return;
    const controller = new AbortController();
    const url = data.mode === 'phrase' ? '/api/translate/sentence' : '/api/translate/word';
    const body = data.mode === 'phrase'
      ? { sentence: data.word }
      : { word: data.word, sentence: data.sentence };

    setResult(null);
    setError(false);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then((json) => {
        if (data.mode === 'phrase') {
          const tr = (json as { translation?: string }).translation ?? '';
          setResult({
            word: data.word,
            meanings: tr ? [{ partOfSpeech: 'phrase', definitionEn: data.word, definitionTr: tr }] : [],
            primaryMeaningIndex: 0,
            source: 'translate',
          });
          setSelectedIdx(0);
        } else {
          const r = json as TranslationResult;
          setResult(r);
          setSelectedIdx(r.primaryMeaningIndex || 0);
        }
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(true);
      });

    return () => controller.abort();
  }, [data.word, data.sentence, data.mode, retry, existingEntry]);

  const handleSpeak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(data.word);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [data.word]);

  const handleRemove = useCallback(() => {
    if (!existingEntry) return;
    const snap = existingEntry;
    removeWord(snap.id);
    showToast('Removed', { onUndo: () => addWord(snap) });
    onClose();
  }, [existingEntry, removeWord, addWord, showToast, onClose]);

  const handleSave = useCallback(() => {
    if (saveState !== 'idle') return;
    if (existingEntry) { handleRemove(); return; }
    if (!result || result.meanings.length === 0) return;

    const meaning = result.meanings[selectedIdx] ?? result.meanings[0];
    const entry: VocabularyEntry = {
      id: crypto.randomUUID(),
      word: data.word,
      lemma: data.word.toLowerCase(),
      phonetic: result.phonetic,
      contextSentence: data.sentence,
      selectedMeaning: meaning,
      allMeanings: result.meanings,
      sourceSessionId: sessionId,
      createdAt: Date.now(),
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewAt: Date.now() + 86_400_000,
      reviewCount: 0,
      correctCount: 0,
    };

    setSaveState('saving');
    addSavedWordId(entry.lemma);
    addWord(entry);
    window.setTimeout(() => {
      setSaveState('saved');
      window.setTimeout(() => {
        showToast('Saved', { onUndo: () => removeWord(entry.id) });
        onClose();
      }, 600);
    }, 50);
  }, [saveState, existingEntry, handleRemove, result, selectedIdx, data.word, data.sentence, sessionId, addSavedWordId, addWord, removeWord, showToast, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (saveState !== 'idle') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (/^[1-4]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1;
        if (result && i < result.meanings.length) { e.preventDefault(); setSelectedIdx(i); }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, saveState, handleSave]);

  if (existingEntry) {
    return (
      <SavedView
        entry={existingEntry}
        sentenceTr={sentenceTr}
        onSpeak={handleSpeak}
        onRemove={handleRemove}
        onClose={onClose}
      />
    );
  }

  if (error) {
    return (
      <ErrorView
        word={data.word}
        onRetry={() => { setError(false); setRetry((n) => n + 1); }}
        onClose={onClose}
      />
    );
  }

  if (!result) return <SkeletonView word={data.word} onClose={onClose} />;

  if (result.meanings.length === 0) {
    return (
      <ErrorView
        word={data.word}
        onRetry={() => { setError(false); setRetry((n) => n + 1); }}
        onClose={onClose}
      />
    );
  }

  return (
    <DataView
      data={data}
      result={result}
      selectedIdx={selectedIdx}
      onSelect={setSelectedIdx}
      saveState={saveState}
      onSave={handleSave}
      onSpeak={handleSpeak}
      onClose={onClose}
      sentenceTr={sentenceTr}
    />
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function PopoverHeader({
  word,
  badge,
  ipa,
  onClose,
}: {
  word: string;
  badge?: string;
  ipa?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-serif text-base font-medium text-foreground">
          {word}
        </span>
        {ipa ? (
          <span className="shrink-0 truncate text-[11px] text-muted-foreground/80">
            {ipa}
          </span>
        ) : null}
        {badge ? (
          <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="-mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function SkeletonView({ word, onClose }: { word: string; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <PopoverHeader word={word} onClose={onClose} />
      <div className="h-px bg-border/60" />
      <div className="space-y-2">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200/70" />
      </div>
    </div>
  );
}

function ErrorView({ word, onRetry, onClose }: { word: string; onRetry: () => void; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <PopoverHeader word={word} onClose={onClose} />
      <div className="h-px bg-border/60" />
      <p className="text-sm text-muted-foreground">Bu kelimenin anlamı yüklenemedi.</p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    </div>
  );
}

interface DataViewProps {
  data: ActivePopover;
  result: TranslationResult;
  selectedIdx: number;
  onSelect: (i: number) => void;
  saveState: 'idle' | 'saving' | 'saved';
  onSave: () => void;
  onSpeak: () => void;
  onClose: () => void;
  sentenceTr?: string | null;
}

function DataView({ data, result, selectedIdx, onSelect, saveState, onSave, onSpeak, onClose, sentenceTr }: DataViewProps) {
  const primary = result.meanings[selectedIdx] ?? result.meanings[0];
  const others = result.meanings.map((m, i) => ({ m, i })).filter(({ i }) => i !== selectedIdx);
  const [showAlternates, setShowAlternates] = useState(false);

  return (
    <div className="flex flex-col gap-0">
      <PopoverHeader
        word={data.mode === 'phrase' ? 'Phrase' : data.word}
        badge={primary.partOfSpeech}
        ipa={data.mode === 'word' ? result.phonetic : undefined}
        onClose={onClose}
      />
      <div className="my-3 h-px bg-border/60" />

      {sentenceTr && data.mode === 'word' ? (
        <div className="mb-3 rounded-md bg-muted/40 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Bu cümlede</div>
          <SentenceWithHighlight
            sentenceTr={sentenceTr}
            definitionTr={primary.definitionTr}
            englishWord={data.word}
          />
        </div>
      ) : null}

      <PrimaryMeaning meaning={primary} />

      {others.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAlternates((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground/70 transition-colors hover:text-foreground"
            aria-expanded={showAlternates}
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', showAlternates ? 'rotate-180' : '')} />
            {showAlternates ? 'Gizle' : `${others.length} diğer anlam`}
          </button>
          {showAlternates ? (
            <ul className="mt-2 space-y-2">
              {others.map(({ m, i }) => (
                <li key={i}>
                  <AlternateMeaning meaning={m} onClick={() => onSelect(i)} shortcut={i < 4 ? String(i + 1) : undefined} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <SaveButton state={saveState} onClick={onSave} />
        <IconButton ariaLabel="Pronounce" onClick={onSpeak}>
          <Volume2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

function PrimaryMeaning({ meaning }: { meaning: WordMeaning }) {
  const hasTr = Boolean(meaning.definitionTr?.trim());
  return (
    <div className="flex items-start gap-2">
      <Star className="mt-1 h-4 w-4 shrink-0 fill-amber-300 text-amber-400" aria-hidden />
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 rounded-sm bg-foreground/10 px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-foreground/60">
            TR
          </span>
          {hasTr ? (
            <span className="font-serif text-lg leading-snug text-foreground">
              {meaning.definitionTr}
            </span>
          ) : (
            <span className="text-sm italic text-muted-foreground/70">
              Türkçe karşılığı yüklenemedi
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 rounded-sm bg-foreground/10 px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-foreground/60">
            EN
          </span>
          <span className="text-sm leading-relaxed text-muted-foreground">
            {meaning.definitionEn}
          </span>
        </div>
        {meaning.example ? (
          <div className="border-l-2 border-border/60 pl-2 text-xs italic leading-relaxed text-muted-foreground/80">
            {meaning.example}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AlternateMeaning({ meaning, onClick, shortcut }: { meaning: WordMeaning; onClick: () => void; shortcut?: string }) {
  const hasTr = Boolean(meaning.definitionTr?.trim());
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-accent"
    >
      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full border border-muted-foreground/40 group-hover:border-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm', hasTr ? 'text-foreground' : 'italic text-muted-foreground/70')}>
            {hasTr ? meaning.definitionTr : 'Türkçe yüklenemedi'}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{meaning.partOfSpeech}</span>
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {meaning.definitionEn}
        </span>
      </span>
      {shortcut ? (
        <kbd className="ml-1 hidden rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground sm:inline-block">
          {shortcut}
        </kbd>
      ) : null}
    </button>
  );
}

function SavedView({
  entry,
  sentenceTr,
  onSpeak,
  onRemove,
  onClose,
}: {
  entry: VocabularyEntry;
  sentenceTr?: string | null;
  onSpeak: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <PopoverHeader
        word={entry.word}
        badge={entry.selectedMeaning.partOfSpeech}
        ipa={entry.phonetic}
        onClose={onClose}
      />
      <div className="h-px bg-border/60" />
      {sentenceTr ? (
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Bu cümlede</div>
          <SentenceWithHighlight
            sentenceTr={sentenceTr}
            definitionTr={entry.selectedMeaning.definitionTr}
            englishWord={entry.word}
          />
        </div>
      ) : null}
      <PrimaryMeaning meaning={entry.selectedMeaning} />
      <div className="text-[11px] text-muted-foreground">Saved {relativeTime(entry.createdAt)}</div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <Check className="h-3.5 w-3.5" />
          Saved (Remove?)
        </button>
        <IconButton ariaLabel="Pronounce" onClick={onSpeak}>
          <Volume2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

function SaveButton({ state, onClick }: { state: 'idle' | 'saving' | 'saved'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state !== 'idle'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
        state === 'saved'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-foreground text-background hover:bg-foreground/90 disabled:opacity-70'
      )}
    >
      {state === 'idle' ? <><Plus className="h-3.5 w-3.5" />Save</>
        : state === 'saving' ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-background/40 border-t-background" />Saving</>
        : <><Check className="h-3.5 w-3.5" />Saved</>}
    </button>
  );
}

function IconButton({ ariaLabel, onClick, children }: { ariaLabel: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

// ─── "Bu cümlede" sentence with highlighted TR equivalent ────────────────────

function SentenceWithHighlight({
  sentenceTr,
  definitionTr,
  englishWord,
}: {
  sentenceTr: string;
  definitionTr?: string;
  englishWord: string;
}) {
  const match = useMemo(
    () => (definitionTr ? findTrMatchInSentence(sentenceTr, definitionTr) : null),
    [sentenceTr, definitionTr]
  );

  if (!match) {
    return <p className="mt-0.5 text-sm leading-relaxed text-foreground">{sentenceTr}</p>;
  }

  return (
    <div>
      <p className="mt-0.5 text-sm leading-relaxed text-foreground">
        <span>{match.before}</span>
        <span className="rounded-sm bg-amber-200/70 px-0.5 font-medium text-amber-900">
          {match.match}
        </span>
        <span>{match.after}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground/60">({englishWord})</p>
    </div>
  );
}

// Turkish closed-class words: never useful as stems for highlight matching.
// Picking "bir" or "şey" as the stem matches any sentence trivially and
// highlights the wrong word — so filter them out before scoring candidates.
const TR_STOP_WORDS = new Set([
  'bir', 'şey', 'olma', 'olmak', 'yapma', 'yapmak', 'etmek', 'etme',
  'için', 'gibi', 'kadar', 'sonra', 'önce', 'daha', 'çok', 'yok',
  'var', 'olan', 'olarak', 'veya', 'ya', 'da', 'de', 'ki', 'mi', 'mu',
  'biri', 'birisi', 'kendi', 'genel', 'özel', 'biraz', 'tüm', 'hep',
  'bazı', 'her', 'hiç', 'belirli', 'çeşitli', 'birçok', 'durum',
  'kişi', 'biri', 'şekil', 'şekilde', 'tarz', 'yer', 'zaman',
]);

interface TrMatch {
  before: string;
  match: string;
  after: string;
  /** Length of the stem that matched — used to pick the BEST candidate. */
  score: number;
}

/**
 * Finds the Turkish word in sentenceTr that best matches definitionTr.
 *
 * Strategy:
 *   - Pull all 4+ char content words from definitionTr (drop Turkish stop words)
 *   - For each candidate, try progressively shorter stems (min 4 chars)
 *   - Score by stem length (longer match = stronger evidence)
 *   - Across all candidates, return the highest-scored match
 *
 * The "longest match wins" tiebreaker is what fixes the bug where short
 * stop-word-ish stems hijacked the highlight for unrelated sentence words.
 */
function findTrMatchInSentence(
  sentenceTr: string,
  definitionTr: string
): TrMatch | null {
  if (!definitionTr || !sentenceTr) return null;

  const defWords = (definitionTr.toLowerCase().match(/\p{L}+/gu) ?? [])
    .filter((w) => w.length >= 4 && !TR_STOP_WORDS.has(w))
    .sort((a, b) => b.length - a.length);
  if (defWords.length === 0) return null;

  const lowerSentence = sentenceTr.toLowerCase();
  let best: TrMatch | null = null;

  for (const defWord of defWords) {
    for (let stemLen = defWord.length; stemLen >= 4; stemLen--) {
      const stem = defWord.slice(0, stemLen);
      let pos = 0;
      while (pos <= lowerSentence.length - stem.length) {
        const idx = lowerSentence.indexOf(stem, pos);
        if (idx === -1) break;

        const prevChar = idx > 0 ? lowerSentence[idx - 1] : '';
        const isWordStart = !prevChar || !/\p{L}/u.test(prevChar);

        if (isWordStart) {
          let end = idx + stem.length;
          while (end < sentenceTr.length && /\p{L}/u.test(sentenceTr[end])) {
            end++;
          }
          const candidate: TrMatch = {
            before: sentenceTr.slice(0, idx),
            match: sentenceTr.slice(idx, end),
            after: sentenceTr.slice(end),
            score: stemLen,
          };
          if (!best || candidate.score > best.score) {
            best = candidate;
          }
          // Stem matched here — no need to keep walking with this same
          // stem; longer stems for the same defWord are tried in outer loop.
          break;
        }
        pos = idx + 1;
      }
      // First (longest) stem hit for this defWord is enough — break inner
      // and let outer loop try the next defWord if it can beat the score.
      if (best && best.score >= stemLen) break;
    }
  }
  return best;
}

// ─── Turkish bag-of-words for meaning auto-select ────────────────────────────

function trBag(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/\p{L}+/gu) ?? []).filter((w) => w.length > 2)
  );
}
