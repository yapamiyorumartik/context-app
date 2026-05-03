/**
 * Lingva Translate client.
 *
 * Lingva is a free, key-less front-end for Google Translate. Quality is
 * Google-grade (much better than MyMemory for prose), and sending whole
 * paragraphs preserves cross-sentence context the way DeepL does — the
 * translator sees pronoun antecedents, idioms, etc.
 *
 * Public instances go up and down. We try a small list in order and
 * give up on the request after the first success or a global timeout.
 *
 * No API key. Cost: $0.
 */

const INSTANCES: ReadonlyArray<string> = [
  'https://lingva.ml',
  'https://lingva.lunar.icu',
  'https://translate.plausibility.cloud',
];

const PER_REQUEST_TIMEOUT_MS = 7000;

export async function translateLingva(
  text: string,
  from: string = 'en',
  to: string = 'tr'
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const base of INSTANCES) {
    const url =
      `${base}/api/v1/${encodeURIComponent(from)}/` +
      `${encodeURIComponent(to)}/${encodeURIComponent(trimmed)}`;

    let res: Response;
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(PER_REQUEST_TIMEOUT_MS),
        headers: { Accept: 'application/json' },
      });
    } catch {
      continue;
    }
    if (!res.ok) continue;

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      continue;
    }
    if (!data || typeof data !== 'object') continue;

    const out = (data as { translation?: unknown }).translation;
    if (typeof out !== 'string') continue;
    const cleaned = out.trim();
    if (cleaned.length > 0) return cleaned;
  }

  return null;
}
