'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  Check,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useReaderStore } from '@/lib/reader/store';
import { useVocabularyStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils/relative-time';
import type { VocabularyEntry, WordMeaning } from '@/types';

interface WordCardProps {
  entry: VocabularyEntry;
}

export function WordCard({ entry }: WordCardProps) {
  const [editing, setEditing] = useState(false);

  const updateWord = useVocabularyStore((s) => s.updateWord);
  const removeWord = useVocabularyStore((s) => s.removeWord);
  const addWord = useVocabularyStore((s) => s.addWord);
  const showToast = useReaderStore((s) => s.showToast);

  const meaningTr =
    entry.selectedMeaning.definitionTr || entry.selectedMeaning.definitionEn;

  const handleDelete = () => {
    const snapshot = entry;
    removeWord(snapshot.id);
    showToast('Deleted', { onUndo: () => addWord(snapshot) });
  };

  const handleResetSrs = () => {
    updateWord(entry.id, { nextReviewAt: Date.now() });
    showToast('Marked due now');
  };

  const handleSelectMeaning = (meaning: WordMeaning) => {
    updateWord(entry.id, { selectedMeaning: meaning });
    setEditing(false);
  };

  return (
    <article className="rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-border">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate font-serif text-lg font-medium text-foreground">
          {entry.word}
        </h3>
        <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {entry.selectedMeaning.partOfSpeech}
        </span>
      </div>

      <div className="mt-1.5 text-[15px] text-foreground">{meaningTr}</div>

      <div className="my-3 h-px w-12 bg-border" />

      <p className="font-serif text-sm italic leading-relaxed text-muted-foreground">
        “{entry.contextSentence}”
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          Saved {relativeTime(entry.createdAt)}
          {entry.reviewCount > 0
            ? ` · Reviewed ${entry.reviewCount} time${entry.reviewCount === 1 ? '' : 's'}`
            : ''}
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton ariaLabel="Delete" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton ariaLabel="Reset review schedule" onClick={handleResetSrs}>
            <RotateCcw className="h-3.5 w-3.5" />
          </IconButton>
          <RowMenu onViewMeanings={() => setEditing((v) => !v)} />
        </div>
      </div>

      {editing ? (
        <MeaningsEditor
          entry={entry}
          onSelect={handleSelectMeaning}
          onCancel={() => setEditing(false)}
        />
      ) : null}
    </article>
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
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function RowMenu({ onViewMeanings }: { onViewMeanings: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="More"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-50 w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onViewMeanings();
            }}
            className="flex w-full items-center rounded px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
          >
            View all meanings
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MeaningsEditor({
  entry,
  onSelect,
  onCancel,
}: {
  entry: VocabularyEntry;
  onSelect: (m: WordMeaning) => void;
  onCancel: () => void;
}) {
  const initialIdx = useMemo(() => {
    const i = entry.allMeanings.findIndex(
      (m) =>
        m.definitionEn === entry.selectedMeaning.definitionEn &&
        m.partOfSpeech === entry.selectedMeaning.partOfSpeech
    );
    return i >= 0 ? i : 0;
  }, [entry]);

  const [selected, setSelected] = useState(initialIdx);
  const dirty = selected !== initialIdx;

  if (entry.allMeanings.length <= 1) {
    return (
      <div className="mt-3 border-t border-border/60 pt-3">
        <p className="text-xs text-muted-foreground">
          No alternate meanings available for this word.
        </p>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        All meanings
      </div>
      <ul className="space-y-1">
        {entry.allMeanings.map((m, i) => {
          const tr = m.definitionTr || m.definitionEn;
          const isSelected = i === selected;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors',
                  isSelected
                    ? 'bg-accent'
                    : 'hover:bg-accent/60'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full border',
                    isSelected
                      ? 'border-foreground bg-foreground'
                      : 'border-muted-foreground/40'
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm text-foreground">{tr}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.partOfSpeech}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    “{m.definitionEn}”
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSelect(entry.allMeanings[selected])}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}
