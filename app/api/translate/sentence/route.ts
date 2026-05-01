import { LRUCache } from 'lru-cache';
import { NextResponse } from 'next/server';

import { translateSentence } from '@/lib/translation/engine';

export const runtime = 'edge';

/**
 * Sentence-level coalescing cache. Sentences are larger payloads,
 * so we keep the cap smaller than the word route's.
 */
const memCache = new LRUCache<string, string>({
  max: 200,
  ttl: 1000 * 60 * 60 * 24,
});

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

  const { sentence: sentenceRaw } = body as { sentence?: unknown };
  const sentence =
    typeof sentenceRaw === 'string' ? sentenceRaw.trim() : '';

  if (!sentence) {
    return NextResponse.json({ error: 'sentence_required' }, { status: 400 });
  }

  const key = sentence.toLowerCase();
  const hit = memCache.get(key);
  if (hit) return NextResponse.json({ translation: hit });

  const translation = await translateSentence(sentence);
  if (translation) memCache.set(key, translation);
  return NextResponse.json({ translation });
}
