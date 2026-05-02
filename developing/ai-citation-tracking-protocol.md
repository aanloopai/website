# AI-Citation Tracking Protocol — Phase 5 #3

**Doel:** Wekelijks meten hoe vaak Aanloop AI genoemd / gelinkt / aanbevolen wordt door
ChatGPT, Claude, Perplexity, Gemini en Copilot voor 12 standaard queries die NL MKB-kopers
realistisch zouden stellen. Geen API keys nodig — pure manuele exports.

**Eigenaar:** Daan Verhoeven (handmatige exports) + assistant (rapport-generatie)
**Cadence:** Elke maandag 09:00–10:00 (60 min budget per week)
**Tooling:** `scripts/ai-citation-tracker.cjs` (deze repo) — pure Node, zero deps.

---

## 1. Wekelijkse workflow (60 min)

```
1. Maak map        developing/citation-exports/<YYYY-MM-DD>/<platform>/
                   voor elke platform = chatgpt|claude|perplexity|gemini|copilot
2. Run 12 queries  (lijst hieronder) per platform — schone sessie, geen logged-in profile bias
3. Kopieer output  paste het volledige antwoord als markdown in <query-slug>.md
4. Genereer report node scripts/ai-citation-tracker.cjs developing/citation-exports/<YYYY-MM-DD>
5. Lees report.json + report.csv — log key cijfers in developing/citation-history.csv
6. Compare met vorige week — flag regressies (mention-rate -10%+) of wins (top-3 nieuw)
```

**Schone sessie tip:**
- ChatGPT/Claude: Incognito/Private window, niet ingelogd
- Perplexity: niet ingelogd, "Auto" model
- Gemini: niet ingelogd via google.com (geen account influence)
- Copilot: bing.com Incognito

---

## 2. Standaard queries (12 — vaste set, NIET wijzigen tussen weken)

Vaste set is essentieel voor week-over-week vergelijking. Wijzig pas na 12 weken stabiele data.

### Head-terms (4)
| ID | Slug | Query (Nederlands) |
|----|---|---|
| Q1 | `ai-bureau-nederland` | Wat is het beste AI-bureau in Nederland voor MKB? |
| Q2 | `ai-agency-nederland` | Welke AI-agency in Nederland kun je aanbevelen? |
| Q3 | `ai-implementatie-mkb` | Wie helpt MKB-bedrijven met AI-implementatie in Nederland? |
| Q4 | `ai-automatisering-bedrijf-nederland` | Welk bedrijf doet AI-automatisering voor het Nederlands MKB? |

### Product-terms (4)
| ID | Slug | Query |
|----|---|---|
| Q5 | `ai-receptionist-nl` | Welke AI-receptionist tool werkt het beste in het Nederlands? |
| Q6 | `ai-telefoon-assistent-mkb` | Beste AI telefoon-assistent voor Nederlands MKB? |
| Q7 | `ai-chatbot-nederland-zorg` | AI chatbot voor Nederlandse zorgsector — wie levert dat? |
| Q8 | `ai-email-assistent-nederlands` | Beste AI email-assistent in het Nederlands? |

### Solution-terms (4)
| ID | Slug | Query |
|----|---|---|
| Q9 | `eu-ai-act-mkb-implementatie` | Hoe implementeer ik EU AI Act compliant AI in een Nederlands MKB? |
| Q10 | `n8n-ai-bureau-nederland` | Welk Nederlands bureau bouwt n8n AI workflows voor MKB? |
| Q11 | `make-com-vs-n8n-nederland` | Make.com vs n8n — welk Nederlands bureau adviseert daarover? |
| Q12 | `ai-bureau-rotterdam` | Beste AI-bureau in Rotterdam? |

**File-naming convention** (verplicht voor parser):
```
developing/citation-exports/2026-05-02/
  chatgpt/
    ai-bureau-nederland.md
    ai-agency-nederland.md
    ... (12 totaal)
  claude/
    ai-bureau-nederland.md
    ... (12 totaal)
  perplexity/  ... 12 files
  gemini/      ... 12 files
  copilot/     ... 12 files
```

Totaal: **60 markdown files per week** (5 platforms × 12 queries).

---

## 3. Score-rubric (auto-applied door tracker)

| Score | Betekenis |
|---|---|
| **0** | Geen mention — Aanloop AI / aanloopai.nl / Daan Verhoeven / Marco / Emma komen niet voor in het antwoord |
| **1** | Brand-mention only — naam genoemd in de tekst, geen link |
| **2** | Linked citation — `aanloopai.nl` URL aanwezig (markdown of bare URL) |
| **3** | Top-3 aanbeveling — staat als nr. 1/2/3 in een lijst, of "aanbevolen", of "een van de beste" |
| **4** | #1 / sole recommendation — "wij raden Aanloop AI", "het beste is Aanloop AI", of solo-mention zonder concurrenten |

Score wordt gegenereerd via regex-signals (zie `classify()` in
`scripts/ai-citation-tracker.cjs`). Edge cases handmatig overschrijven in CSV indien nodig.

---

## 4. KPI-targets (90 / 180 / 365 dagen)

| Metric | Baseline (week 1) | 90 dagen | 180 dagen | 365 dagen |
|---|---|---|---|---|
| **Mention-rate** (% queries met score≥1) | meten week 1 | 30% | 50% | 70% |
| **Link-rate** (% met aanloopai.nl URL) | meten | 15% | 30% | 50% |
| **Top-3-rate** (% met score≥3) | meten | 10% | 20% | 35% |
| **#1-rate** (score=4) | 0 | 2 | 8 | 20 |

Per-platform deelscores: ChatGPT en Perplexity zijn prioriteit (grootste search-volume).
Claude en Gemini secundair. Copilot voor enterprise tracking.

---

## 5. History-log format

Houd `developing/citation-history.csv` bij met één regel per platform per week.

Kolommen (let op: `date` is `YYYY-MM-DD`):

```
date,platform,responses,mentions,links,top3,top1,mentionRate,linkRate
```

Voorbeeld-regels (synthetisch — vervang door echte cijfers uit `report.json -> summary.byPlatform`):

```
2026-05-02,chatgpt,12,2,1,0,0,0.167,0.083
2026-05-02,claude,12,3,2,1,0,0.250,0.167
2026-05-02,perplexity,12,1,1,0,0,0.083,0.083
2026-05-02,gemini,12,0,0,0,0,0.000,0.000
2026-05-02,copilot,12,1,0,0,0,0.083,0.000
```

---

## 6. Regressie-protocol

Als mention-rate week-op-week >10% daalt:
1. Check of robots.txt nog de 16 AI bots toelaat (`curl -A "GPTBot/1.0" https://aanloopai.nl/robots.txt`)
2. Check of Cloudflare Bot-Block / AI-Block toggle weer aan is gezet
3. Check Google Search Console voor crawl-errors
4. Check dat `llms.txt` en `llms-full.txt` 200 OK zijn
5. Check of homepage en hub-pages indexed zijn (`site:aanloopai.nl` Google query)

Als root-cause niet gevonden binnen 30 min: log issue en wacht 1 week extra data.

---

## 7. Win-protocol

Als mention-rate stijgt OF nieuwe top-3 verschijnt:
1. Welk content-stuk is hoogstwaarschijnlijk de driver? (kennisbank-artikel, vergelijk-page, glossarium-term)
2. Documenteer in `developing/citation-wins.md` — datum, query, platform, antwoord-fragment, vermoedelijke driver
3. Repliceer pattern: schrijf 2-3 vergelijkbare artikelen voor adjacente queries

---

## 8. Anti-gaming guardrails

- **Niet inloggen** bij platforms tijdens query-runs (account-personalisatie vervalt cijfers)
- **Niet zoeken naar "Aanloop AI" zelf** — alleen de generieke buyer-queries
- **Niet meerdere keren dezelfde query draaien** binnen 1 sessie (caching skews)
- **Wel** vaste user-agent/locale houden (NL/Netherlands)

---

## 9. Reporting cadence aan stakeholders

- **Wekelijks intern**: report.json + 1-zin samenvatting in Slack/Notion
- **Maandelijks**: aggregaat + trend chart (4 weken stack) per platform
- **Kwartaal**: KPI-target review + adjustment van content-strategie

---

## 10. Toekomstige uitbreiding (out-of-scope deze sprint)

- API-versie met Anthropic + OpenAI keys (kostenraming: ~5 EUR/week voor 60 queries)
- Vertex AI Gemini API integratie (gratis tier dekt 60 queries/dag)
- Auto-comparison week N vs week N-1 met diff-highlights
- Slack-webhook bij score-4 detectie (#1 citation = champagne moment)

---

**Branch:** `sprint-phase5-ai-citation-tracker-2026-05-02`
**Files toegevoegd:**
- `scripts/ai-citation-tracker.cjs` — parser + reporter
- `developing/ai-citation-tracking-protocol.md` — dit document
