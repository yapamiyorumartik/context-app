/**
 * MyMemory translation API client.
 * https://mymemory.translated.net
 *
 * MyMemory rate-limits per IP. We only call it for short English
 * dictionary definitions, never for the full text the user reads.
 *
 * Returns null on any failure; callers must tolerate that.
 */

const ENDPOINT = 'https://api.mymemory.translated.net/get';
const TIMEOUT_MS = 5000;

export async function translateText(
  text: string,
  from: string = 'en',
  to: string = 'tr'
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const url =
    `${ENDPOINT}?q=${encodeURIComponent(trimmed)}` +
    `&langpair=${encodeURIComponent(`${from}|${to}`)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object') return null;
  const obj = data as { responseData?: { translatedText?: unknown } };
  const translated = obj.responseData?.translatedText;
  if (typeof translated !== 'string') return null;
  const out = translated.trim();
  return out.length > 0 ? out : null;
}
