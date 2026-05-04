'use client';

import { useRef } from 'react';

import { useHydratedStore } from '@/hooks/useHydratedStore';
import { clearAllData } from '@/lib/storage';
import {
  commitImport,
  exportToCSV,
  exportToJSON,
  parseImportFile,
} from '@/lib/storage/export';
import { useVocabularyStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { ReadingFontSize } from '@/types';

const FONT_SIZES: { id: ReadingFontSize; label: string; px: string }[] = [
  { id: 'sm', label: 'Small', px: '17px' },
  { id: 'md', label: 'Medium', px: '19px' },
  { id: 'lg', label: 'Large', px: '22px' },
];

export default function SettingsPage() {
  const hydrated = useHydratedStore();
  const settings = useVocabularyStore((s) => s.settings);
  const updateSettings = useVocabularyStore((s) => s.updateSettings);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFontSize: ReadingFontSize = settings.readingFontSize ?? 'md';
  const shakeEnabled = settings.enableReviewShake ?? true;

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await parseImportFile(file);
    if (!result.ok) {
      window.alert(`Import failed: ${result.message}`);
      return;
    }
    const { preview } = result.data;
    const ok = window.confirm(
      `Found ${preview.total} words: ${preview.newCount} new, ${preview.duplicateCount} duplicates.\n\nImport?`
    );
    if (!ok) return;
    const added = commitImport(result.data);
    window.alert(`Imported ${added} new word${added === 1 ? '' : 's'}.`);
  };

  const handleClear = () => {
    const first = window.confirm(
      'Clear all data? This deletes every saved word, session, and translation cache.'
    );
    if (!first) return;
    const second = window.confirm(
      'Are you absolutely sure? This cannot be undone.'
    );
    if (!second) return;
    clearAllData();
    window.location.href = '/';
  };

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-10">
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
        Settings
      </h1>

      <Section title="Reading">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Font size</span>
          <div
            className="ml-auto inline-flex rounded-md border border-border/60 bg-card p-0.5"
            role="radiogroup"
            aria-label="Reading font size"
          >
            {FONT_SIZES.map((f) => {
              const active = hydrated && currentFontSize === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ readingFontSize: f.id })}
                  className={cn(
                    'rounded-[4px] px-3 py-1 text-xs transition-colors',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Review">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Shake on wrong answer</div>
            <div className="text-xs text-muted-foreground">
              Subtle horizontal nudge when you pick the wrong option.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shakeEnabled}
            onClick={() =>
              updateSettings({ enableReviewShake: !shakeEnabled })
            }
            className={cn(
              'ml-auto inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border/60 transition-colors',
              shakeEnabled ? 'bg-foreground' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform',
                shakeEnabled ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </Section>

      <Section title="Backup">
        <p className="text-sm text-muted-foreground">
          All your data lives in this browser. Back it up to keep it safe.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton onClick={exportToJSON}>Export as JSON</ActionButton>
          <ActionButton onClick={exportToCSV}>
            Export as CSV (Anki-friendly)
          </ActionButton>
          <ActionButton onClick={handleImportClick}>
            Import from JSON
          </ActionButton>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </Section>

      <Section title="Danger zone">
        <p className="text-sm text-muted-foreground">
          This permanently deletes every word, reading session, and translation
          cache.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Clear all data
          </button>
        </div>
      </Section>

      <Section title="About">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Context is a free reading companion for B2+ Turkish learners of
          English. No accounts, no tracking, no API keys. Translations come
          from the Free Dictionary API and MyMemory — both free public
          services. Everything you save lives on your device.
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-border/60 pt-6">
      <h2 className="font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border/60 bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      {children}
    </button>
  );
}
