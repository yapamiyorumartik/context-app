import { LRUCache } from 'lru-cache';
import { NextResponse } from 'next/server';

import { translateWord } from '@/lib/translation/engine';
import type { TranslationResult } from '@/lib/translation/types';

export const runtime = 'edge';

/**
 * In-process LRU cache. Edge instances are short-lived and per-region,
 * so this is a soft coalescer for hot keys — not a long-term cache.
 * The authoritative client cache is localStorage on each user's device.
 */
const memCache = new LRUCache<string, TranslationResult>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24, // 24h
});

// TODO(rate-limit): add per-IP throttling once we see real traffic.
// Skipping for the MVP since both upstream APIs are free and we already
// cache aggressively client-side.

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

  const { word: wordRaw, sentence: sentenceRaw } = body as {
    word?: unknown;
    sentence?: unknown;
  };

  const word = typeof wordRaw === 'string' ? wordRaw.trim() : '';
  const sentence = typeof sentenceRaw === 'string' ? sentenceRaw.trim() : '';

  if (!word) {
    return NextResponse.json({ error: 'word_required' }, { status: 400 });
  }

  const cacheKey = `${word.toLowerCase()}::${sentence.toLowerCase()}`;
  const hit = memCache.get(cacheKey);
  if (hit) return NextResponse.json(hit);

  const result = await translateWord(word, sentence);
  memCache.set(cacheKey, result);
  return NextResponse.json(result);
}
