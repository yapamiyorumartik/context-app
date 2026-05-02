/**
 * Generic Turkish meanings used to pad MEANING_MATCH options when the
 * user's vocabulary is too small to supply real distractors.
 *
 * These are intentionally common, single-word translations across noun /
 * verb / adjective so they look plausibly like dictionary entries without
 * accidentally being the actual answer to any common B2 lookup.
 */
export const DISTRACTOR_POOL: readonly string[] = [
  // Nouns (~25)
  'ev',
  'kitap',
  'masa',
  'kalem',
  'göz',
  'el',
  'ayak',
  'su',
  'ekmek',
  'çocuk',
  'kadın',
  'adam',
  'gün',
  'gece',
  'yol',
  'şehir',
  'hayat',
  'iş',
  'para',
  'zaman',
  'dünya',
  'ülke',
  'dil',
  'müzik',
  'film',
  // Verbs (~15)
  'yapmak',
  'gitmek',
  'gelmek',
  'vermek',
  'almak',
  'görmek',
  'bakmak',
  'bilmek',
  'anlamak',
  'sevmek',
  'istemek',
  'beklemek',
  'başlamak',
  'çalışmak',
  'okumak',
  // Adjectives (~10)
  'büyük',
  'küçük',
  'yeni',
  'eski',
  'güzel',
  'hızlı',
  'yavaş',
  'kolay',
  'zor',
  'mutlu',
];
