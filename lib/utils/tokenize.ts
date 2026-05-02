/**
 * Paragraph tokenizer used by the Reader.
 *
 * Output is a flat list of tokens that, concatenated by `text`, reproduces
 * the input paragraph (modulo collapsing the inter-sentence whitespace
 * captured by the splitter into a single space — close enough for prose).
 *
 * Each token carries `sentenceIdx` so a click on a word can be paired
 * with its full surrounding sentence for context-aware translation.
 */

export type TokenType = 'word' | 'punct' | 'space';

export interface Token {
  type: TokenType;
  text: string;
  sentenceIdx: number;
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

// Order matters: word | whitespace | single non-word punct.
//   word  := letter (letter | digit | apostrophe | smart-apostrophe | hyphen)* letter|digit
//          | single letter (e.g. "I", "a")
//          | bare number with optional decimal/comma group (e.g. "3.14", "1,000")
const TOKEN_RE =
  /([A-Za-z](?:[A-Za-z0-9'’\-]*[A-Za-z0-9])?|\d+(?:[.,]\d+)?)|(\s+)|([^\s\w])/g;

function tokenizeSentence(sentence: string, sentenceIdx: number): Token[] {
  const out: Token[] = [];
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(sentence)) !== null) {
    if (match[1] !== undefined) {
      out.push({ type: 'word', text: match[1], sentenceIdx });
    } else if (match[2] !== undefined) {
      out.push({ type: 'space', text: match[2], sentenceIdx });
    } else if (match[3] !== undefined) {
      out.push({ type: 'punct', text: match[3], sentenceIdx });
    }
  }
  return out;
}

export function tokenizeParagraph(p: string): Token[] {
  if (!p) return [];
  const sentences = p.split(SENTENCE_SPLIT);
  const tokens: Token[] = [];
  sentences.forEach((s, idx) => {
    if (idx > 0) {
      // Restore the boundary whitespace as a single space, attached to
      // the upcoming sentence so word-clicks always reference the right one.
      tokens.push({ type: 'space', text: ' ', sentenceIdx: idx });
    }
    tokens.push(...tokenizeSentence(s, idx));
  });
  return tokens;
}

/**
 * Reconstruct the full text of a single sentence from a token list.
 * Cheaper than re-splitting the paragraph at click-time.
 */
export function getSentenceText(tokens: Token[], sentenceIdx: number): string {
  let out = '';
  for (const t of tokens) {
    if (t.sentenceIdx === sentenceIdx) out += t.text;
  }
  return out.trim();
}
