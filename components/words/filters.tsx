'use client';

import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';

export type FilterId = 'all' | 'recent' | 'due';
export type SortId = 'recent' | 'alphabetical' | 'most-reviewed';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
  { id: 'due', label: 'Due for review' },
];

interface FiltersProps {
  filter: FilterId;
  onFilterChange: (id: FilterId) => void;
  search: string;
  onSearchChange: (q: string) => void;
  sort: SortId;
  onSortChange: (id: SortId) => void;
  dueCount: number;
}

export function Filters({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  dueCount,
}: FiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const showCount = f.id === 'due' && dueCount > 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                active
                  ? 'border-foreground/80 bg-foreground text-background'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {f.label}
              {showCount ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[10px] tabular-nums',
                    active
                      ? 'bg-background/20 text-background'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {dueCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search words or meanings..."
            className="h-9 w-full rounded-md border border-border/60 bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-border"
          />
        </label>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortId)}
          className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-border"
          aria-label="Sort"
        >
          <option value="recent">Recent</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="most-reviewed">Most reviewed</option>
        </select>
      </div>
    </div>
  );
}
