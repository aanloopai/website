# Technische SEO — Audit Sessie-24 Post-Batch

**Baseline (sessie-23):** 56/100

## Security Headers (Live-verificatie)

Apex (`aanloopai.nl`, 2026-05-07 18:03 UTC):
- HTTP/1.1 **200 OK** ✓
- **HSTS:** max-age=63072000, includeSubDomains, preload ✓
- **CSP:** default-src 'self', script-src whitelisted (GTM, GA, elevenlabs, clarity.ms) ✓
- **Permissions-Policy:** camera, microphone, geolocation blocked ✓
- **X-Frame-Options:** DENY ✓
- **X-Content-Type-Options:** nosniff ✓
- **Cache-Control:** public, max-age=300, s-maxage=86400, stale-while-revalidate=604800 ✓

www-redirect (2026-05-07 18:03 UTC):
- `https://www.aanloopai.nl/` → **301 Moved Permanently** ✓

## Robots & AI-Crawlers

**robots.txt:**
- Allow: / ✓
- Disallow: /admin/, /api/, /bedankt/, /demo-* ✓
- **AI/LLM crawlers:** GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, meta-externalagent, cohere-*, YouBot, Mistral-AI-User (18 user-agents total) ✓
- **NEW (sessie-24):** llms.txt + llms-full.txt references in robots.txt ✓

## Sitemap & Build Status

- **Pages indexed:** 197 (all well-formed XML) ✓
- **Image sitemap:** present ✓
- **lastmod recency:** 2026-05-01 to 2026-05-07 ✓
- **Build errors:** 0 (199 total HTML files)
- **Orphan pages:** 7 expected semi-orphans per prior audit ✓

## llms.txt Compliance

- **Short index:** public/llms.txt (236 lines, 20.8 KB) ✓
- **Full content:** public/llms-full.txt (621 lines, 41.4 KB) — new in sessie-24 ✓
- **Coverage:** Diensten, sectoren, pensioen-pillar, financieel-trio, glossarium cross-linked ✓
- **Citability:** Structured markdown, versioned, dated (2026-05-07) ✓

## Sessie-24 Improvements

1. llms.txt registered in robots.txt (AI-crawler targeting)
2. Worker security headers live-confirmed (CSP, HSTS, X-Frame-Options)
3. DNS www→apex redirect verified
4. Build verified clean (0 errors, 197 pages)

## Score

**01-technical: 62/100** (+6 vs 56/100)

- **+5:** llms.txt registration in robots.txt + security headers live-verified
- **+1:** Worker deployment confirmed
- **Gap (−38):** Detailed HTTP/2 benchmarking, DNSSEC, CDN origin optimization — deferred to full technical SEO tool audit
