import { LRUCache } from 'lru-cache';
import { NextResponse } from 'next/server';

import { translateLongText } from '@/lib/translation/engine';

export const runtime = 'edge';

/**
 * Long-text translation route — used by the reader's "Show translation"
 * panel. Single request returns the whole article rendered in Turkish.
 */
const memCache = new LRUCache<string, string>({
  max: 50,
  ttl: 1000 * 60 * 60 * 24,
});

const MAX_INPUT_CHARS = 12_000;

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { text: textRaw } = body as { text?: unknown };
  const text = typeof textRaw === 'string' ? textRaw.trim() : '';

  if (!text) {
    return NextResponse.json({ error: 'text_required' }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: 'text_too_long', limit: MAX_INPUT_CHARS },
      { status: 413 }
    );
  }

  const key = text;
  const hit = memCache.get(key);
  if (hit) return NextResponse.json({ translation: hit });

  const translation = await translateLongText(text);
  if (!translation) {
    return NextResponse.json({ error: 'translation_failed' }, { status: 502 });
  }
  memCache.set(key, translation);
  return NextResponse.json({ translation });
}
