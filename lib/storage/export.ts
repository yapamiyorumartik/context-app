'use client';

import {
  exportAllData,
  getSessions,
  getSettings,
  getVocabulary,
} from '@/lib/storage';
import { useVocabularyStore } from '@/lib/storage/store';
import { hashContext } from '@/lib/utils/hash';
import type {
  AppSettings,
  ReadingSession,
  VocabularyEntry,
} from '@/types';

// ───── Helpers ─────

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the browser has had a tick to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function markExported(): void {
  useVocabularyStore.getState().updateSettings({ lastExportedAt: Date.now() });
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ───── Export ─────

export function exportToJSON(): void {
  const blob = exportAllData();
  downloadBlob(blob, `context-backup-${isoDate()}.json`);
  markExported();
}

const CSV_HEADERS = [
  'word',
  'lemma',
  'contextSentence',
  'meaning',
  'partOfSpeech',
  'savedAt',
  'reviewCount',
  'correctCount',
] as const;

export function exportToCSV(): void {
  const rows = getVocabulary();
  const lines: string[] = [CSV_HEADERS.join(',')];
  for (const v of rows) {
    const meaning =
      v.selectedMeaning.definitionTr || v.selectedMeaning.definitionEn;
    lines.push(
      [
        csvEscape(v.word),
        csvEscape(v.lemma),
        csvEscape(v.contextSentence),
        csvEscape(meaning),
        csvEscape(v.selectedMeaning.partOfSpeech),
        new Date(v.createdAt).toISOString(),
        String(v.reviewCount),
        String(v.correctCount),
      ].join(',')
    );
  }
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  downloadBlob(blob, `context-words-${isoDate()}.csv`);
  markExported();
}

// ───── Import ─────

export interface ImportPreview {
  total: number;
  newCount: number;
  duplicateCount: number;
}

export interface ParsedImport {
  preview: ImportPreview;
  newEntries: VocabularyEntry[];
  sessions?: ReadingSession[];
  settings?: Partial<AppSettings>;
}

export type ParseResult =
  | { ok: true; data: ParsedImport }
  | { ok: false; message: string };

function isVocabularyEntry(v: unknown): v is VocabularyEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<VocabularyEntry>;
  return (
    typeof e.id === 'string' &&
    typeof e.word === 'string' &&
    typeof e.lemma === 'string' &&
    typeof e.contextSentence === 'string' &&
    !!e.selectedMeaning
  );
}

export async function parseImportFile(file: File): Promise<ParseResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, message: 'Could not read file.' };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Invalid JSON.' };
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: 'Invalid file format.' };
  }

  const obj = raw as {
    vocabulary?: unknown;
    sessions?: unknown;
    settings?: unknown;
  };
  if (!Array.isArray(obj.vocabulary)) {
    return { ok: false, message: 'No vocabulary found in file.' };
  }

  const incoming = obj.vocabulary.filter(isVocabularyEntry);

  // Dedupe by SHA-256(lemma + contextSentence) against existing data.
  const seen = new Set<string>();
  for (const e of getVocabulary()) {
    seen.add(await hashContext(e.lemma, e.contextSentence));
  }

  const newEntries: VocabularyEntry[] = [];
  for (const e of incoming) {
    const key = await hashContext(e.lemma, e.contextSentence);
    if (seen.has(key)) continue;
    seen.add(key);
    newEntries.push(e);
  }

  return {
    ok: true,
    data: {
      preview: {
        total: incoming.length,
        newCount: newEntries.length,
        duplicateCount: incoming.length - newEntries.length,
      },
      newEntries,
      sessions: Array.isArray(obj.sessions)
        ? (obj.sessions as ReadingSession[])
        : undefined,
      settings:
        obj.settings && typeof obj.settings === 'object'
          ? (obj.settings as Partial<AppSettings>)
          : undefined,
    },
  };
}

/**
 * Commit a parsed import. Returns the number of vocabulary rows added.
 * Sessions are merged similarly; settings are not auto-restored to avoid
 * surprising the user (e.g. resetting their streak).
 */
export function commitImport(parsed: ParsedImport): number {
  const store = useVocabularyStore.getState();
  for (const entry of parsed.newEntries) {
    store.addWord(entry);
  }
  if (parsed.sessions) {
    const existingSessionIds = new Set(
      getSessions().map((s) => s.id)
    );
    for (const s of parsed.sessions) {
      if (!existingSessionIds.has(s.id)) {
        store.addSession(s);
      }
    }
  }
  // Touch settings so we keep the existing values; we re-read from storage.
  store.updateSettings(getSettings());
  return parsed.newEntries.length;
}
