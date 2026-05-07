# Platform Readiness — Audit Sessie-24 Post-Batch

**Baseline (sessie-23):** 67/100

## Per-platform readiness

### Google AI Overviews
- Pensioen-cluster nu volledig topical-hub via 4 cross-link entry-points → verhoogt cluster-coherence signaal
- HowTo schema-removal voorkomt schema-spam-flag op niet-tutorial-pagina's
- Speakable schema 197/197 ongewijzigd
- **Effect:** lichte stijging (+2)

### ChatGPT (web search)
- llms.txt + llms-full.txt registered in robots.txt blijven beschikbaar
- 18 AI-crawlers expliciet allowed (incl. OAI-SearchBot, ChatGPT-User)
- Pensioen-pillar Lees-ook section verbreedt context-cluster bij AI-citatie
- **Effect:** licht positief (+1)

### Perplexity
- ClaudeBot, PerplexityBot allowed in robots.txt
- llms-full.txt cite-friendly stats blijven onveranderd (sessie-23 +18 stats)
- Cross-link uitbreiding reduceert orphan-pages → completere knowledge-graph
- **Effect:** licht positief (+1)

### Google Gemini
- Google-Extended allowed
- HSTS + security-headers live na Worker deploy → trust-signal verhoging
- Pensioen-pillar nu hub-and-spoke verbeter cluster-strength
- **Effect:** licht positief (+1)

### Bing Copilot
- Bingbot allowed in robots.txt
- Geen IndexNow ping in deze cyclus (postbuild auto-skip lokaal); productie-Worker doet auto-ping
- **Effect:** neutraal (0)

## Schema-quality gain (Track A indirect impact)

HowTo verwijderen → minder schema-pollution in output. Voor platforms die schema-quality scoren is dit een positieve delta zelfs als raw-count daalt.

## Score

**03-platform: 71/100** (+4 vs 67/100)

- **+2:** Google AI Overviews gain via cluster-coherence
- **+2:** Schema-quality lift (HowTo-pollution weg)
- **Gap (−29):** Geen Bing Webmaster, geen Google Business Profile claim — user-side deferred.
