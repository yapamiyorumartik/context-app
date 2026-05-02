'use client';

import * as Popover from '@radix-ui/react-popover';
import { Database } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  commitImport,
  exportToCSV,
  exportToJSON,
  parseImportFile,
} from '@/lib/storage/export';
import { clearAllData } from '@/lib/storage';

export function DataMenu() {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = () => setOpen(false);

  const handleExportJSON = () => {
    close();
    exportToJSON();
  };

  const handleExportCSV = () => {
    close();
    exportToCSV();
  };

  const handleImportClick = () => {
    close();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleClearAll = () => {
    close();
    const first = window.confirm(
      'Clear all data? This deletes every saved word, session, and translation cache.'
    );
    if (!first) return;
    const second = window.confirm(
      'Are you absolutely sure? This cannot be undone.'
    );
    if (!second) return;
    clearAllData();
    window.location.reload();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Backup and import"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Database className="h-4 w-4" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="end"
            sideOffset={6}
            className="z-50 w-60 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none"
          >
            <MenuItem onClick={handleExportJSON} label="Export as JSON" hint="Full backup" />
            <MenuItem onClick={handleExportCSV} label="Export as CSV" hint="Anki-friendly" />
            <MenuDivider />
            <MenuItem onClick={handleImportClick} label="Import from JSON" hint="Pick a file" />
            <MenuDivider />
            <MenuItem
              onClick={handleClearAll}
              label="Clear all data"
              hint="Cannot be undone"
              destructive
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

function MenuItem({
  onClick,
  label,
  hint,
  destructive = false,
}: {
  onClick: () => void;
  label: string;
  hint?: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-baseline justify-between gap-3 rounded px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent ' +
        (destructive ? 'text-red-700 hover:text-red-800' : 'text-foreground')
      }
    >
      <span>{label}</span>
      {hint ? (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-border/60" />;
}
