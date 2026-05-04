/**
 * Lingva Translate client.
 *
 * Lingva is a free, key-less front-end for Google Translate. Quality is
 * Google-grade (much better than MyMemory for prose), and sending whole
 * paragraphs preserves cross-sentence context the way DeepL does — the
 * translator sees pronoun antecedents, idioms, etc.
 *
 * Instances go up and down. We hit them ALL in parallel and take the
 * first usable response (`Promise.any`). One slow instance can no longer
 * stall the whole pipeline — the worst case is the global timeout below.
 *
 * No API key. Cost: $0.
 */

const INSTANCES: ReadonlyArray<string> = [
  'https://lingva.ml',
  'https://lingva.lunar.icu',
  'https://translate.plausibility.cloud',
];

// Per-instance timeout. Kept tight so the engine can fall back to
// MyMemory quickly when Lingva is having a bad day.
const PER_REQUEST_TIMEOUT_MS = 5000;

export async function translateLingva(
  text: string,
  from: string = 'en',
  to: string = 'tr'
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const attempts = INSTANCES.map((base) => fetchOne(base, trimmed, from, to));

  try {
    return await Promise.any(attempts);
  } catch {
    // All instances failed (Promise.any throws AggregateError).
    return null;
  }
}

async function fetchOne(
  base: string,
  text: string,
  from: string,
  to: string
): Promise<string> {
  const url =
    `${base}/api/v1/${encodeURIComponent(from)}/` +
    `${encodeURIComponent(to)}/${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(PER_REQUEST_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`status ${res.status}`);

  const data = (await res.json()) as { translation?: unknown };
  const out = data.translation;
  if (typeof out !== 'string') throw new Error('no translation field');
  const cleaned = out.trim();
  if (cleaned.length === 0) throw new Error('empty translation');
  return cleaned;
}
