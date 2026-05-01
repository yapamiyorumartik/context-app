/**
 * Free Dictionary API client.
 * https://api.dictionaryapi.dev
 *
 * Returns null on 404 / network error / malformed payload — the caller
 * is expected to fall back to a translation API.
 */

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const TIMEOUT_MS = 5000;

export interface DictionaryDefinition {
  definition: string;
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryResponse {
  word: string;
  meanings: DictionaryMeaning[];
}

export async function fetchWordDefinition(
  word: string
): Promise<DictionaryResponse | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  const url = `${ENDPOINT}/${encodeURIComponent(trimmed.toLowerCase())}`;

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

  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0];
  if (!first || typeof first !== 'object') return null;
  const root = first as { word?: unknown; meanings?: unknown };
  if (typeof root.word !== 'string' || !Array.isArray(root.meanings)) {
    return null;
  }

  const meanings: DictionaryMeaning[] = [];
  for (const raw of root.meanings) {
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as { partOfSpeech?: unknown; definitions?: unknown };
    if (typeof m.partOfSpeech !== 'string') continue;
    if (!Array.isArray(m.definitions)) continue;

    const defs: DictionaryDefinition[] = [];
    for (const dRaw of m.definitions) {
      if (!dRaw || typeof dRaw !== 'object') continue;
      const d = dRaw as { definition?: unknown; example?: unknown };
      if (typeof d.definition !== 'string' || !d.definition.trim()) continue;
      defs.push({
        definition: d.definition,
        example: typeof d.example === 'string' ? d.example : undefined,
      });
    }

    if (defs.length > 0) {
      meanings.push({ partOfSpeech: m.partOfSpeech, definitions: defs });
    }
  }

  if (meanings.length === 0) return null;
  return { word: root.word, meanings };
}
