'use client';

import { useEffect, useMemo, useState } from 'react';

import { BackupBanner } from '@/components/words/backup-banner';
import { DataMenu } from '@/components/words/data-menu';
import {
  Filters,
  type FilterId,
  type SortId,
} from '@/components/words/filters';
import { WordsEmpty } from '@/components/words/empty-state';
import { WordCard } from '@/components/words/word-card';
import { ReaderToast } from '@/components/reader/toast';
import { useHydratedStore } from '@/hooks/useHydratedStore';
import { useVocabularyStore } from '@/lib/storage/store';

const PAGE_SIZE = 30;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function WordsPage() {
  const hydrated = useHydratedStore();
  const vocabulary = useVocabularyStore((s) => s.vocabulary);
  const settings = useVocabularyStore((s) => s.settings);

  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortId>('recent');
  const [shown, setShown] = useState(PAGE_SIZE);

  // Reset pagination when the result set could change.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [filter, search, sort]);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return vocabulary.filter((v) => v.nextReviewAt <= now).length;
  }, [vocabulary]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let arr = vocabulary;

    if (filter === 'recent') {
      arr = arr.filter((v) => v.createdAt >= now - SEVEN_DAYS_MS);
    } else if (filter === 'due') {
      arr = arr.filter((v) => v.nextReviewAt <= now);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((v) => {
        return (
          v.word.toLowerCase().includes(q) ||
          v.lemma.includes(q) ||
          v.selectedMeaning.definitionTr.toLowerCase().includes(q) ||
          v.selectedMeaning.definitionEn.toLowerCase().includes(q)
        );
      });
    }

    const sorted = [...arr];
    if (sort === 'recent') {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'alphabetical') {
      sorted.sort((a, b) =>
        a.word.toLowerCase().localeCompare(b.word.toLowerCase())
      );
    } else if (sort === 'most-reviewed') {
      sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return sorted;
  }, [vocabulary, filter, search, sort]);

  const visible = filtered.slice(0, shown);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
            Your Words
          </h1>
          {hydrated ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {vocabulary.length} word{vocabulary.length === 1 ? '' : 's'}
              {dueCount > 0
                ? ` · ${dueCount} due for review`
                : ''}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
          )}
        </div>
        <DataMenu />
      </header>

      {hydrated ? (
        <BackupBanner
          count={vocabulary.length}
          lastExportedAt={settings.lastExportedAt}
        />
      ) : null}

      {hydrated && vocabulary.length === 0 ? (
        <WordsEmpty />
      ) : (
        <>
          <div className="mt-6">
            <Filters
              filter={filter}
              onFilterChange={setFilter}
              search={search}
              onSearchChange={setSearch}
              sort={sort}
              onSortChange={setSort}
              dueCount={dueCount}
            />
          </div>

          <div className="mt-6 space-y-3">
            {hydrated && filtered.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No matches.
              </p>
            ) : (
              visible.map((entry) => (
                <WordCard key={entry.id} entry={entry} />
              ))
            )}
          </div>

          {shown < filtered.length ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE_SIZE)}
                className="rounded-md border border-border/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Load more · {filtered.length - shown} left
              </button>
            </div>
          ) : null}
        </>
      )}

      <ReaderToast />
    </div>
  );
}
