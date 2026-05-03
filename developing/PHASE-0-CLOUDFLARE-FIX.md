# Phase 0 — Cloudflare AI Bot Block Fix (USER ACTION REQUIRED)

**Prioriteit:** KRITIEK — blokkeert alle AI-visibility werk
**Tijd:** 5 minuten in Cloudflare dashboard
**Wie:** Alleen user (vereist Cloudflare account login)

---

## Het probleem

Live test bewijs (2026-05-02):

```bash
$ curl -I https://aanloopai.nl/ -A "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)"
HTTP/1.1 403 Forbidden

$ curl -s https://aanloopai.nl/robots.txt | head -50
# BEGIN Cloudflare Managed content

User-agent: *
Content-Signal: search=yes,ai-train=no
Allow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CloudflareBrowserRenderingCrawler
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /
```

Onze eigen `public/robots.txt` heeft **Allow: /** voor alle 16 AI-bots, maar Cloudflare overschrijft dit met "Cloudflare Managed Content" en serveert een DENY-list. Bovendien geeft Cloudflare WAF/Bot Fight `403 Forbidden` aan AI-crawler User-Agents.

**Impact voor een AI bureau:** ChatGPT, Claude.ai, Perplexity, Google AI Overviews, Bing Copilot kunnen aanloopai.nl niet crawlen, niet groundden, niet citeren. Voor een AI agency die wil scoren in AI-aangedreven antwoorden is dit fataal.

---

## De fix (3 stappen)

### Stap 1 — AI Bot Block uitschakelen

1. Login op https://dash.cloudflare.com
2. Selecteer domein **aanloopai.nl**
3. Linker zijbalk: **Security** -> **Bots**
4. Zoek de toggle **"AI Bot Block"** of **"Block AI Scrapers and Crawlers"**
5. Zet deze **UIT** (Off / Disabled)
6. Bewaar wijzigingen

### Stap 2 — Bot Fight Mode uitschakelen voor onze gewenste AI-bots

1. Cloudflare Dashboard -> **Security** -> **Bots**
2. **"Bot Fight Mode"** -> als deze AAN staat, overweeg uit te zetten OF maak een uitzondering
3. Beter: ga naar **Security** -> **WAF** -> **Custom rules** -> **Create rule**
   - Rule name: `Allow AI Crawlers`
   - Field: `User Agent`
   - Operator: `contains`
   - Value: `GPTBot` (maak meerdere rules of gebruik regex)
   - Action: `Skip` -> selecteer alle Bot Fight features om over te slaan
   - Apply to alle bots: GPTBot, ClaudeBot, anthropic-ai, ChatGPT-User, OAI-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, meta-externalagent, Bingbot, Amazonbot, DuckAssistBot

### Stap 3 — Override Cloudflare Managed robots.txt

Als Cloudflare onze eigen `robots.txt` blijft overschrijven:

**Optie A (eenvoudigst):**
1. Cloudflare Dashboard -> **Caching** -> **Configuration** -> **Page Rules** of **Cache Rules**
2. Maak rule: URL `aanloopai.nl/robots.txt` -> Cache Level: **Bypass** + Origin Cache Control: ON
3. Dit forceert dat onze eigen `public/robots.txt` van origin geserveerd wordt, niet Cloudflare's managed versie

**Optie B (Cloudflare zone-level setting):**
1. Cloudflare Dashboard -> **Scrape Shield** of **AI Audit** (afhankelijk van Cloudflare versie)
2. Zoek "Robots.txt management" optie -> zet UIT

**Optie C (als laatste redmiddel):**
1. Verplaats `robots.txt` van `public/robots.txt` naar een Astro server-route die de juiste content serveert met expliciete `Cache-Control: public, max-age=300` headers.

---

## Verificatie (binnen 10 minuten na fix)

Run deze 5 commando's. Alle moeten **HTTP/1.1 200 OK** geven en onze 16-bot Allow-list tonen:

```bash
# Test 1: GPTBot moet 200 krijgen
curl -I https://aanloopai.nl/ -A "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)"

# Test 2: ClaudeBot moet 200 krijgen
curl -I https://aanloopai.nl/ -A "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"

# Test 3: PerplexityBot moet 200 krijgen
curl -I https://aanloopai.nl/ -A "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://www.perplexity.ai/perplexitybot)"

# Test 4: ChatGPT-User moet 200 krijgen
curl -I https://aanloopai.nl/ -A "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)"

# Test 5: robots.txt moet ONZE versie tonen
curl -s https://aanloopai.nl/robots.txt | grep -A 1 "GPTBot"
# Verwacht: "User-agent: GPTBot" + "Allow: /"
# Niet: "User-agent: GPTBot" + "Disallow: /"
```

Als alle 5 tests slagen -> Phase 0 is voltooid.

---

## Waarom dit zo belangrijk is (samengevat)

- **Aanloop AI is een AI bureau.** Onze potentiele klanten vragen ChatGPT/Claude: "Wat is een goed AI bureau in Nederland voor mijn MKB?"
- AI-systems leren van wat ze kunnen crawlen. Als wij geblokkeerd zijn, leren ze van onze concurrenten en bevelen die aan.
- Google AI Overviews en Bing Copilot zijn al verantwoordelijk voor 15-30% van zoekverkeer-volume in 2026, en groeit snel.
- Een geblokkeerde site krijgt 0% van die nieuwe verkeer-stroom.

**Eenvoudig gezegd: zonder deze fix verkopen wij onze hardste concurrenten aan onze potentiele klanten.**

---

## Na voltooiing

1. Stuur bevestiging "Cloudflare fix DONE" aan assistant
2. Assistant gaat verder met Phase 1 implementaties (vergelijk-pages, locaties, glossarium, pillars)
3. Ondertussen kun je beginnen met Phase 4 user-tracks (backlink outreach, GBP claim, Capterra listings)

---

**Last updated:** 2026-05-02
**Owner:** User (Daan Verhoeven)
**Reference doc:** `developing/MASTER-PLAN-NL1-2026-05-02.md` Phase 0
