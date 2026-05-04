'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  Check,
  ChevronDown,
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

import {
  useReaderStore,
  type ActivePopover,
} from '@/lib/reader/store';
import { useVocabularyStore } from '@/lib/storage/store';
import type { TranslationResult } from '@/lib/translation/types';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils/relative-time';
import type { VocabularyEntry, WordMeaning } from '@/types';

/** Top-level host: renders one Radix Popover, anchored to the latest click rect. */
export function TranslationPopoverHost() {
  const active = useReaderStore((s) => s.activePopover);
  const hide = useReaderStore((s) => s.hidePopover);

  return (
    <Popover.Root
      open={!!active}
      modal={false}
      onOpenChange={(o) => {
        if (!o) hide();
      }}
    >
      {active ? (
        <Popover.Anchor asChild>
          <span
            aria-hidden="true"
            className="pointer-events-none fixed"
            style={{
              top: active.rect.top,
              left: active.rect.left,
              width: active.rect.width,
              height: active.rect.height,
            }}
          />
        </Popover.Anchor>
      ) : null}

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="center"
          sideOffset={8}
          collisionPadding={12}
          avoidCollisions
          className="z-50 w-[320px] max-w-[calc(100vw-16px)] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none"
        >
          {active ? (
            <PopoverBody
              key={`${active.mode}::${active.word}::${active.sentence}`}
              data={active}
              onClose={hide}
            />
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Popover body ────────────────────────────────────────────────────────────

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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  );

  // Fetch translation (skip if word already saved — we have it locally).
  useEffect(() => {
    if (existingEntry) return;
    const controller = new AbortController();

    const url =
      data.mode === 'phrase'
        ? '/api/translate/sentence'
        : '/api/translate/word';
    const body =
      data.mode === 'phrase'
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
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))
      )
      .then((json) => {
        if (data.mode === 'phrase') {
          const tr = (json as { translation?: string }).translation ?? '';
          setResult({
            word: data.word,
            meanings: tr
              ? [
                  {
                    partOfSpeech: 'phrase',
                    definitionEn: data.word,
                    definitionTr: tr,
                  },
                ]
              : [],
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
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(data.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [data.word]);

  const handleRemove = useCallback(() => {
    if (!existingEntry) return;
    const snapshot = existingEntry;
    removeWord(snapshot.id);
    showToast('Removed', { onUndo: () => addWord(snapshot) });
    onClose();
  }, [existingEntry, removeWord, addWord, showToast, onClose]);

  const handleSave = useCallback(() => {
    if (saveState !== 'idle') return;
    if (existingEntry) {
      handleRemove();
      return;
    }
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
    // Optimistic underline immediately.
    addSavedWordId(entry.lemma);
    addWord(entry);

    window.setTimeout(() => {
      setSaveState('saved');
      window.setTimeout(() => {
        showToast('Saved', { onUndo: () => removeWord(entry.id) });
        onClose();
      }, 600);
    }, 50);
  }, [
    saveState,
    existingEntry,
    handleRemove,
    result,
    selectedIdx,
    data.word,
    data.sentence,
    sessionId,
    addSavedWordId,
    addWord,
    removeWord,
    showToast,
    onClose,
  ]);

  // Keyboard shortcuts: 1-4 select meaning, S save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (saveState !== 'idle') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (/^[1-4]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1;
        if (result && i < result.meanings.length) {
          e.preventDefault();
          setSelectedIdx(i);
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, saveState, handleSave]);

  // ─ Already-saved view ─
  if (existingEntry) {
    return (
      <SavedView
        entry={existingEntry}
        onSpeak={handleSpeak}
        onRemove={handleRemove}
        onClose={onClose}
      />
    );
  }

  // ─ Error view ─
  if (error) {
    return (
      <ErrorView
        word={data.word}
        onRetry={() => {
          setError(false);
          setRetry((n) => n + 1);
        }}
        onClose={onClose}
      />
    );
  }

  // ─ Skeleton view ─
  if (!result) {
    return <SkeletonView word={data.word} onClose={onClose} />;
  }

  // ─ Empty result (dictionary returned nothing usable) ─
  if (result.meanings.length === 0) {
    return (
      <ErrorView
        word={data.word}
        onRetry={() => {
          setError(false);
          setRetry((n) => n + 1);
        }}
        onClose={onClose}
      />
    );
  }

  // ─ Data view ─
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
    />
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

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
      <div className="space-y-2 pt-1">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200/70" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

function ErrorView({
  word,
  onRetry,
  onClose,
}: {
  word: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <PopoverHeader word={word} onClose={onClose} />
      <div className="h-px bg-border/60" />
      <p className="text-sm text-muted-foreground">
        Bu kelimenin anlamı yüklenemedi.
      </p>
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
}

function DataView({
  data,
  result,
  selectedIdx,
  onSelect,
  saveState,
  onSave,
  onSpeak,
  onClose,
}: DataViewProps) {
  const primary = result.meanings[selectedIdx] ?? result.meanings[0];
  const others = result.meanings
    .map((m, i) => ({ m, i }))
    .filter(({ i }) => i !== selectedIdx);
  // Collapsed by default — most users only need the context-best meaning.
  // The toggle is there for the rare case Lesk picked the wrong sense.
  const [showAlternates, setShowAlternates] = useState(false);

  return (
    <div className="flex max-h-[70vh] flex-col">
      <PopoverHeader
        word={data.mode === 'phrase' ? 'Phrase' : data.word}
        badge={primary.partOfSpeech}
        ipa={data.mode === 'word' ? result.phonetic : undefined}
        onClose={onClose}
      />
      <div className="my-3 h-px bg-border/60" />

      <div className="overflow-y-auto pr-1">
        <PrimaryMeaning meaning={primary} />

        {others.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowAlternates((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground/70 transition-colors hover:text-foreground"
              aria-expanded={showAlternates}
            >
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform',
                  showAlternates ? 'rotate-180' : ''
                )}
              />
              {showAlternates ? 'Gizle' : `${others.length} diğer anlam`}
            </button>

            {showAlternates ? (
              <ul className="mt-2 space-y-2">
                {others.map(({ m, i }) => (
                  <li key={i}>
                    <AlternateMeaning
                      meaning={m}
                      onClick={() => onSelect(i)}
                      shortcut={i < 4 ? String(i + 1) : undefined}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <SaveButton state={saveState} onClick={onSave} />
        <div className="flex items-center gap-1">
          <IconButton ariaLabel="Pronounce" onClick={onSpeak}>
            <Volume2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function PrimaryMeaning({ meaning }: { meaning: WordMeaning }) {
  const tr = meaning.definitionTr || meaning.definitionEn;
  return (
    <div>
      <div className="flex items-start gap-2">
        <Star
          className="mt-1 h-4 w-4 shrink-0 fill-amber-300 text-amber-400"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="font-serif text-lg leading-snug text-foreground">
            {tr}
          </div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            “{meaning.definitionEn}”
          </div>
          {meaning.example ? (
            <div className="mt-1 text-xs italic leading-relaxed text-muted-foreground/80">
              {meaning.example}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AlternateMeaning({
  meaning,
  onClick,
  shortcut,
}: {
  meaning: WordMeaning;
  onClick: () => void;
  shortcut?: string;
}) {
  const tr = meaning.definitionTr || meaning.definitionEn;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-accent"
    >
      <span
        aria-hidden="true"
        className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full border border-muted-foreground/40 transition-colors group-hover:border-foreground"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm text-foreground">{tr}</span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
            {meaning.partOfSpeech}
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          “{meaning.definitionEn}”
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
  onSpeak,
  onRemove,
  onClose,
}: {
  entry: VocabularyEntry;
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

      <PrimaryMeaning meaning={entry.selectedMeaning} />

      <div className="text-[11px] text-muted-foreground">
        Saved {relativeTime(entry.createdAt)}
      </div>

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

// ─── Tiny shared bits ────────────────────────────────────────────────────────

function SaveButton({
  state,
  onClick,
}: {
  state: 'idle' | 'saving' | 'saved';
  onClick: () => void;
}) {
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
      {state === 'idle' ? (
        <>
          <Plus className="h-3.5 w-3.5" />
          Save
        </>
      ) : state === 'saving' ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-background/40 border-t-background" />
          Saving
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5" />
          Saved
        </>
      )}
    </button>
  );
}

function IconButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
