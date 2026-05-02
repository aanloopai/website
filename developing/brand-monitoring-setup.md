# Brand Monitoring Setup — Phase 10 Defensive Moat

**Doel:** Defensieve laag voor permanent NL #1 positie. Detect (a) brand mentions in nieuws/blogs/sociale media (b) competitor moves (c) reputatie-risico's voor Aanloop AI / Daan Verhoeven / Marco / Emma — binnen 24 uur na publicatie.

**Eigenaar:** Daan Verhoeven (setup eenmalig + dagelijkse 5-min triage)
**Tooling:** Google Alerts (gratis), handmatige Reddit/HN polls, optioneel Talkwalker/Mention.com (paid tier later)
**Cadence:** Setup vandaag → dagelijkse 5-min email triage → wekelijks 30-min review

---

## 1. Google Alerts — 19 queries (kopieer-paste in https://www.google.com/alerts)

**Alert-instellingen voor elke query:**
- How often: **As-it-happens** (brand) of **Once a day** (competitor)
- Sources: **Automatic**
- Language: **Dutch** + **English**
- Region: **Netherlands** (waar relevant — voor head-terms juist niet)
- Deliver to: hello@aanloopai.nl

### Brand-alerts (5) — As-it-happens
| Query | Doel |
|---|---|
| `"Aanloop AI"` | Direct merk-mentions |
| `"aanloopai.nl"` | URL-mentions in artikelen of forums |
| `"Aanloop AI" OR "aanloopai"` -site:aanloopai.nl | Externe mentions, eigen domein excluded |
| `"AANLOOP AI"` | Caps-variant in persberichten |
| `"@aanloopai"` | Social-handle mentions |

### Personnel-alerts (3) — As-it-happens
| Query |
|---|
| `"Daan Verhoeven" "AI"` |
| `"Daan Verhoeven" Rotterdam` |
| `"Daan Verhoeven" aanloop` |

### Product-alerts (4) — Once a day
| Query | Disambiguation |
|---|---|
| `"Marco AI" receptionist` | Onderscheid van andere "Marco" producten |
| `"Marco AI" telefoon` | NL-specifieke product context |
| `"Emma AI" chatbot` | Idem |
| `"Emma AI" Nederlands` | NL-specifieke product context |

### Competitor-alerts (4) — Once a day, NL-region
| Query |
|---|
| `Watermelon AI Nederland` |
| `Chatlayer AI` |
| `Trengo AI MKB` |
| `Belsimpel AI receptionist` |

### Head-term-alerts (3) — Once a day, NL+EN
| Query | Doel |
|---|---|
| `"AI bureau Nederland" review` | Detect blog-posts / "best of" lijsten |
| `"AI agency Nederland" 2026` | Idem voor 2026-content |
| `"beste AI receptionist" Nederlands` | Buyer-intent content |

---

## 2. Reddit + Hacker News + LinkedIn (handmatig wekelijks)

### Reddit subs (zoek met query in elke sub, weekly)
- r/Netherlands — `aanloop OR "AI bureau" OR "AI receptionist"`
- r/thenetherlands — `aanloop OR ondernemen AI`
- r/MKB_Nederland (als bestaat) — alle posts scannen
- r/SmallBusiness — `Netherlands AI`
- r/automation — `n8n Netherlands AI`

Tip: gebruik https://www.reddit.com/search/?q=&restrict_sr=on&sr_name=Netherlands

### Hacker News (zoek wekelijks via hn.algolia.com)
- `aanloop OR aanloopai`
- `"AI agency" Netherlands OR Dutch`
- `MKB AI Netherlands`

### LinkedIn (handmatig)
- Search "Aanloop AI" → Posts → Past Week (NL-filter)
- Search "Daan Verhoeven" → Posts mentioning (Past Month)
- Search "AI bureau Nederland" → Posts → Past Week → save 5 best als content-inspiratie

### Twitter/X (alleen handmatig, geen alerts)
- Twee keer per week: search "Aanloop AI" lang:nl since:7d

---

## 3. Competitor-tracking spreadsheet (template)

Houd `developing/competitor-tracking.csv` bij. Synthetische rij-voorbeelden:

```csv
date,competitor,channel,event,url,impact,action
2026-05-02,Watermelon,blog,Nieuwe pricing-page,https://example.com/a,medium,price-check + counter-content
2026-05-02,Chatlayer,linkedin,Founder-post NL MKB,https://example.com/b,low,monitor
2026-05-02,Trengo,nieuws,Series A funding,https://example.com/c,high,competitive-positioning blog
```

**Kolommen:**
- `date` (YYYY-MM-DD)
- `competitor` (Watermelon | Chatlayer | Trengo | Belsimpel | Voiceflow | Botpress | overig)
- `channel` (blog | linkedin | nieuws | reddit | hn | twitter | youtube | google-ads)
- `event` (vrije tekst, max 60 chars)
- `url`
- `impact` (low | medium | high)
- `action` (monitor | counter-content | feature-parity | pricing-review | outreach | none)

---

## 4. Dagelijkse 5-min triage (mail-inbox routine)

Email-filter: alle Google Alerts → label `brand-monitoring` + skip Inbox.

Routine 09:00:
1. Open label `brand-monitoring` (gisteravond + vannacht alerts)
2. Scan onderwerpen → categorize: BRAND | PERSONNEL | PRODUCT | COMPETITOR | HEAD-TERM
3. Voor elke BRAND/PERSONNEL hit: open de URL, lees 30 sec, beslis:
   - **Positief / neutraal** → log in `developing/citation-wins.md` als "external mention"
   - **Negatief** → bekijk binnen 24 uur, bepaal response (reply, contact owner, niet reageren)
   - **Spam / off-topic** → archive
4. Voor COMPETITOR hits: log in `competitor-tracking.csv` indien `medium`/`high` impact
5. Voor HEAD-TERM hits: open in tab, doe content-gap-analyse later op woensdag

Tijdsbudget: hard cap 5 min. Wat niet binnen 5 min triagebaar is → "to-review" stack voor wekelijkse sessie.

---

## 5. Wekelijks 30-min review (woensdag 10:00)

1. **Triage to-review stack** uit dagelijkse routine (10 min)
2. **Reddit/HN/LinkedIn handmatige search** uit sectie 2 (10 min)
3. **Competitor-tracking aggregate** — 1 zin samenvatting + 1 actie per `high`-impact event (5 min)
4. **Update `developing/citation-history.csv`** met week-totalen (5 min) — zie ai-citation-tracking-protocol.md

---

## 6. Negative-mention response playbook

| Type | Response binnen | Actie |
|---|---|---|
| Klacht klant op review-site (Trustpilot, Google) | 24 uur | Persoonlijk reageren, oplossing aanbieden, laten zien dat het opgelost is |
| Negatieve blog-post zonder feiten | 48 uur | Alleen reageren als feitelijk onjuist; anders SEO laten doen zijn werk |
| Tweet/Reddit-post met klacht | 24 uur | Korte erkenning + DM/email-aanbod, niet publiek discussiëren |
| Concurrent-FUD ("Aanloop AI is duur/slecht") | Niet reageren | Counter-content schrijven over het sterke punt waar FUD over gaat |
| Pers-vraag (positief/negatief) | Same-day | Daan persoonlijk reageren, niet via chatbot |

---

## 7. Reputatie-KPI's (kwartaalreview)

| Metric | Q1 baseline | Q2 target | Q4 target |
|---|---|---|---|
| Google Alerts brand mentions/maand | meten | 15 | 50 |
| Reddit/HN brand mentions/maand | meten | 3 | 10 |
| LinkedIn brand mentions/maand | meten | 8 | 25 |
| Negatieve mentions ratio | <5% | <3% | <2% |
| Response-tijd negatief | meten | <24u 100% | <12u 100% |
| Trustpilot reviews count | 0 | 10 | 50 |
| Trustpilot rating | -- | 4.5+ | 4.7+ |

---

## 8. Setup-checklist (eenmalig — vandaag 30 min)

- [ ] Google Alerts: 19 queries instellen via google.com/alerts (10 min)
- [ ] Email-filter `brand-monitoring` label aanmaken in Gmail (2 min)
- [ ] `developing/competitor-tracking.csv` aanmaken met header-row (1 min)
- [ ] `developing/citation-wins.md` aanmaken met datum-stamp template (1 min)
- [ ] Bookmarks-folder "Brand Monitoring" met links naar:
  - https://www.google.com/alerts (manage alerts)
  - https://www.reddit.com/r/Netherlands/search/
  - https://hn.algolia.com/
  - https://www.linkedin.com/search/results/all/
  - https://www.trustpilot.com/review/aanloopai.nl (claim profiel)
- [ ] Talkwalker free trial (optioneel — paid tier 49 EUR/mnd later overwegen)
- [ ] Mention.com 14-dagen trial (optioneel — vergelijk met Talkwalker)

---

## 9. Escalatie-paden

- **Crisis (viral negative)**: Daan persoonlijk → leverancier-PR-bureau (TBD) → response-statement binnen 4u
- **Legal (laster, IP-claim)**: Direct naar advocaat-kantoor (TBD)
- **Klant-incident**: AVG-functionaris (TBD) + customer-success → resolution + post-mortem
- **Competitor-FUD**: SEO/content-team → counter-content sprint binnen 1 week

---

## 10. Toekomstige uitbreiding (niet-deze-sprint)

- **Talkwalker / Mention.com / Brand24** — paid tier voor sentiment-analyse + reach-metrics
- **Brandwatch** — enterprise tier voor trend-detection + share-of-voice
- **Daily-digest dashboard** — eigen Notion-page met live RSS-feeds van alle Google Alerts
- **Slack-integratie** — alerts → #brand-monitoring channel ipv email
- **Auto-classifier** — Claude API om alerts te classificeren als positief/negatief/neutraal voordat ze de inbox raken (reduce triage tijd 5 min → 1 min)

---

**Branch:** `sprint-phase10-brand-monitoring-2026-05-02`
**File toegevoegd:**
- `developing/brand-monitoring-setup.md` — dit document
