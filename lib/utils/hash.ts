/**
 * Stable cache key for a (word, sentence) pair.
 * Same word in different sentences gets a different hash,
 * so contextual translations cache independently.
 */
export async function hashContext(
  word: string,
  sentence: string
): Promise<string> {
  const input = `${word.toLowerCase()}::${sentence.toLowerCase().trim()}`;
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
