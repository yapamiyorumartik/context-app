# CLAUDE.md

## Project
Context is a context-aware English reading companion for Turkish B2+ learners.

## Goal
Help users read difficult English content without breaking reading flow, while improving vocabulary retention naturally.

## Core Principles
- Prioritize reading flow
- Keep UX friction low
- Avoid clutter
- Keep interactions lightweight
- Focus on contextual translation
- Focus on sustainable vocabulary retention
- Build MVP only
- Avoid overengineering
- Minimize API cost

## Agent Routing (ZORUNLU)
Her görevde önce `wiki/agents/index.md` routing tablosuna bak → uygun ajanı seç → o .md'yi oku → karakterine bürün → yanıtın başına etiket koy.
- "düzelt/yaz/fix" → 🛠️ wiki/agents/yazilimci.md
- "denetle/review/incele" → 🔍 wiki/agents/denetleyici.md
- "değerlendir/sence/öneri" → 🧭 wiki/agents/degerlendirici.md
- "ux/kullanıcı/akış" → 👤 wiki/agents/ux-uzmani.md