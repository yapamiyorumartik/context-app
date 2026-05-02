# Context

A context-aware English reading companion for Turkish B2+ learners.

Read difficult English content without breaking reading flow, and grow your vocabulary naturally as you go.

## 100% free, no API keys required

- No paid AI APIs (no OpenAI, no Anthropic, no DeepL)
- No backend, no database, no auth
- All user data lives in the browser (`localStorage`)
- Translation comes from free public APIs:
  - [Free Dictionary API](https://api.dictionaryapi.dev) — word definitions
  - [MyMemory](https://mymemory.translated.net) — EN → TR translation
- Hosting: Vercel free tier — `$0/month` end to end

## Setup

```bash
git clone <this-repo>
cd context-app
npm install
npm run dev
```

Open <http://localhost:3000>.

No `.env` required. The app works fully offline-first against free public APIs.

## Deploy

1. Push the repo to GitHub.
2. In Vercel, import the project. No build configuration changes needed.
3. No environment variables to set.

That's it.

The translation API routes use Edge Runtime, so they run free on Vercel's global edge.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (slate, CSS variables)
- Radix Popover (translation popover, menus)
- framer-motion (micro-animations, respects `prefers-reduced-motion`)
- zustand (client state)
- lru-cache (in-memory translation cache on the Edge route)
- lucide-react (icons)

## Routes

- `/` — landing for first-time visitors; redirects to `/home` once you've started reading
- `/home` — dashboard: greeting, what's due, continue reading, collection
- `/read` — reader: paste any English text, tap any word for instant Turkish meaning
- `/words` — your saved vocabulary, with search, filters, export, import, clear
- `/review` — 3-challenge / ~60-second SRS review session
- `/settings` — font size, backup, danger zone, about
- `/api/translate/word` — POST `{ word, sentence }` → contextual translation
- `/api/translate/sentence` — POST `{ sentence }` → phrase translation
- `/api/health` — `{ status, version, timestamp }`

## Architecture notes

- **Storage layer** (`lib/storage`) is the only thing touching `localStorage`. Versioned keys (`context.*.v1`) so future migrations are easy. Swappable for a real DB without touching components.
- **Translation engine** (`lib/translation`) orchestrates dictionary + translation + caching + a POS heuristic for picking the most likely sense. Swappable for an LLM later — `translateWord(word, sentence)` is the only contract callers care about.
- **SRS** (`lib/srs`) is a simplified SM-2: scheduler picks the batch, algorithm updates ease/interval, challenges generates four UI variants from local data only.

## Future upgrades (each a swap, not a rewrite)

- Add an LLM to `/api/translate/word/route.ts` for sharper contextual sense selection (the engine + heuristic stays as a fast / free fallback).
- Add Supabase to `lib/storage` for cross-device sync (the public API of the storage module doesn't change).
- Add an LLM-graded `NUANCE_CHECK` / `REWRITE_PROMPT` challenge type — the challenge generator already discriminates by `ChallengeType`.
