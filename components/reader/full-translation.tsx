'use client';

import { Eye, EyeOff, Languages, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface FullTranslationProps {
  text: string;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

const CACHE_KEY_PREFIX = 'context.fullTranslation.v1.';
const CLIENT_TIMEOUT_MS = 12_000;

export function FullTranslation({ text }: FullTranslationProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [translation, setTranslation] = useState<string>('');
  const [revealed, setRevealed] = useState<boolean>(false);
  const startedFor = useRef<string | null>(null);

  const cacheKey = useCacheKey(text);

  const fetchTranslation = useCallback(async () => {
    setStatus('loading');
    const controller = new AbortController();

    const fetchPromise = fetch('/api/translate/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { translation?: string };
        const out = (data.translation ?? '').trim();
        if (!out) throw new Error('empty translation');
        return out;
      });

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        controller.abort();
        reject(new Error('client_timeout'));
      }, CLIENT_TIMEOUT_MS);
    });

    try {
      const out = await Promise.race([fetchPromise, timeoutPromise]);
      setTranslation(out);
      setStatus('ready');
      if (cacheKey) {
        try {
          window.sessionStorage.setItem(cacheKey, out);
        } catch {
          /* ignore */
        }
      }
    } catch {
      setStatus('error');
    }
  }, [text, cacheKey]);

  useEffect(() => {
    if (!text || !cacheKey) return;
    if (startedFor.current === cacheKey) return;
    startedFor.current = cacheKey;

    setRevealed(false);

    let cached: string | null = null;
    try {
      cached = window.sessionStorage.getItem(cacheKey);
    } catch {
      cached = null;
    }
    if (cached) {
      setTranslation(cached);
      setStatus('ready');
      return;
    }

    fetchTranslation();
  }, [text, cacheKey, fetchTranslation]);

  const handleRetry = () => {
    if (cacheKey) {
      try {
        window.sessionStorage.removeItem(cacheKey);
      } catch {
        /* ignore */
      }
    }
    fetchTranslation();
  };

  return (
    <section
      aria-label="Tam metin çevirisi"
      className="mx-auto mt-12 max-w-[680px] px-4 pb-24 sm:px-6"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Languages className="h-4 w-4 text-muted-foreground" />
          Türkçe çevirisi
        </div>
        <StatusPill
          status={status}
          revealed={revealed}
          onToggleReveal={() => setRevealed((r) => !r)}
          onRetry={handleRetry}
        />
      </header>

      <div className="mt-3">
        <Body
          status={status}
          revealed={revealed}
          translation={translation}
          onReveal={() => setRevealed(true)}
        />
      </div>
    </section>
  );
}

function StatusPill({
  status,
  revealed,
  onToggleReveal,
  onRetry,
}: {
  status: Status;
  revealed: boolean;
  onToggleReveal: () => void;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Çevriliyor...
      </span>
    );
  }
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" />
        Tekrar dene
      </button>
    );
  }
  if (status === 'ready') {
    return (
      <button
        type="button"
        onClick={onToggleReveal}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {revealed ? (
          <>
            <EyeOff className="h-3 w-3" />
            Gizle
          </>
        ) : (
          <>
            <Eye className="h-3 w-3" />
            Göster
          </>
        )}
      </button>
    );
  }
  return null;
}

function Body({
  status,
  revealed,
  translation,
  onReveal,
}: {
  status: Status;
  revealed: boolean;
  translation: string;
  onReveal: () => void;
}) {
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-2 rounded-md border border-dashed border-border/60 bg-card/40 p-4">
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <p className="rounded-md border border-dashed border-border/60 bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
        Çeviri yüklenemedi. Tekrar denemek için yukarıdaki butona tıkla.
      </p>
    );
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'whitespace-pre-wrap rounded-md border border-border/50 bg-card/40 px-4 py-4 font-serif text-[17px] leading-relaxed text-[#2A2A2A] transition-[filter] duration-200',
          revealed ? 'blur-0' : 'select-none blur-md'
        )}
        aria-hidden={!revealed}
      >
        {translation}
      </div>
      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Çeviriyi göster"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            <Eye className="h-4 w-4" />
            Çeviriyi göster
          </span>
        </button>
      ) : null}
    </div>
  );
}

function useCacheKey(text: string): string | null {
  if (!text) return null;
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return CACHE_KEY_PREFIX + (h >>> 0).toString(36);
}
