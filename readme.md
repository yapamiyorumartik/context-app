# Context

A context-aware English reading companion for Turkish B2+ learners.

Read difficult English content without breaking reading flow, and grow your vocabulary naturally as you go.

## 100% free MVP

- No paid AI APIs
- No backend, no database, no auth
- All user data lives in the browser (`localStorage`)
- Translation comes from free public APIs:
  - [Free Dictionary API](https://api.dictionaryapi.dev) — word definitions
  - [MyMemory](https://mymemory.translated.net) — EN→TR translation
- Hosting: Vercel free tier

## Setup

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (slate, CSS variables)
- framer-motion (micro-animations)
- zustand (client state)
- lru-cache (in-memory translation cache)
- lucide-react (icons)
