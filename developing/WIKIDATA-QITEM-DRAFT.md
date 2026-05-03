# Wikidata Q-item Draft — Aanloop AI

**Status:** READY-TO-PUBLISH — kopieer-plak naar wikidata.org
**Why:** ChatGPT/Gemini/Perplexity grounden entity-recognition op Wikidata. Alle 3 GEO-audits flaggen 0-presence als #1 blocker. Eenmalige setup, permanente impact.
**Datum draft:** 2026-05-03

---

## Stap 1 — Wikidata account

1. https://www.wikidata.org/wiki/Special:CreateAccount
2. Username `DaanVerhoevenAanloop` of vergelijkbaar
3. Email + sterke password
4. Bevestig email

## Stap 2 — Create new item

https://www.wikidata.org/wiki/Special:NewItem

### Labels (vereist)

| Taal | Label |
|------|-------|
| Nederlands (`nl`) | Aanloop AI |
| Engels (`en`) | Aanloop AI |
| Duits (`de`) | Aanloop AI |

### Descriptions (vereist, korte ene-zin)

| Taal | Description |
|------|-------------|
| Nederlands (`nl`) | Nederlands AI-bureau dat AI-agents bouwt voor het MKB |
| Engels (`en`) | Dutch AI agency building AI agents for SMBs |
| Duits (`de`) | Niederländische KI-Agentur, baut KI-Agenten für KMU |

### Aliases (alternatieve schrijfwijzen)

- `Aanloop AI B.V.`
- `aanloopai`
- `Aanloop`
- `aanloopai.nl`

---

## Stap 3 — Statements (klikken op "Add statement")

### Identity & classificatie

| Property | Value | Property-ID | Value-ID |
|----------|-------|-------------|----------|
| instance of | business | P31 | Q4830453 |
| industry | artificial intelligence | P452 | Q11660 |
| industry | software industry | P452 | Q880687 |

### Geografisch

| Property | Value | Property-ID | Value-ID |
|----------|-------|-------------|----------|
| country | Netherlands | P17 | Q55 |
| located in | Rotterdam | P131 | Q34370 |
| headquarters location | Rotterdam | P159 | Q34370 |

### Identifiers (cruciaal voor grounding)

| Property | Value | Property-ID |
|----------|-------|-------------|
| Chamber of Commerce identifier | 88606902 | P3220 |
| official website | https://aanloopai.nl | P856 |
| email address | hello@aanloopai.nl | P968 |

### Relaties

| Property | Value | Property-ID |
|----------|-------|-------------|
| founded by | Daan Verhoeven | P112 *(optional, vereist Daan's eigen Q-item — overslaan tot dat bestaat)* |
| inception | 2025 | P571 *(KvK-registratie jaar)* |

### sameAs / external links (zeer belangrijk)

| Property | Value | Property-ID |
|----------|-------|-------------|
| GitHub username | aanloopai | P2037 |
| official URL | https://aanloopai.nl | P856 |

---

## Stap 4 — References per statement (waar mogelijk)

Voor "instance of business" + "located in Rotterdam" + "Chamber of Commerce identifier":

```
reference URL (P854): https://www.kvk.nl/zoeken/?source=all&q=88606902
title: KvK Handelsregister 88606902
publisher: Kamer van Koophandel
retrieved: <today's date>
```

Voor "official website":

```
reference URL: https://aanloopai.nl
title: Aanloop AI - Officiële website
retrieved: <today's date>
```

---

## Stap 5 — Submit + wachten op indexering

- "Save" klikken na elke statement
- Wikidata indexering: 24-72 uur tot AI-grounding tools je Q-item ophalen
- Q-item krijgt URL-vorm: `https://www.wikidata.org/wiki/Q<nummer>`
- **Bewaar dit Q-nummer** — gebruik het in BaseLayout.astro Organization schema:

  ```js
  // Toevoegen aan src/layouts/BaseLayout.astro Organization schema sameAs:
  sameAs: [
    'https://linkedin.com/in/daanverhoeven',
    'https://www.kvk.nl/zoeken/?source=all&q=88606902',
    'https://www.wikidata.org/wiki/Q<NUMMER>',  // ← dit toevoegen
  ]
  ```

  Dit is de schakel die ChatGPT/Gemini/Perplexity helpt te grounden.

---

## Stap 6 — Verify (na 48u)

- ChatGPT vraag: "What is Aanloop AI?" — moet entity-recognized zijn
- Perplexity zoek: "Aanloop AI Nederland" — moet bron citeren
- Gemini vraag: "Who founded Aanloop AI?" — moet weten

Als ze nog niet kennen: wachten tot crawler-cycle gepasseerd (kan 1-2 weken zijn).

---

## Wat NIET op Wikidata zetten

- Geen prijzen (€597 etc.) — kunnen veranderen, niet entity-relevant
- Geen marketing-claims ("beste AI-bureau", etc.) — wordt gemarkeerd als POV
- Geen klantnamen — privacy + niet verifieerbaar
- Geen "AggregateRating" of reviews — past niet in Wikidata model

---

## Notabiliteits-risico

Wikidata heeft een lagere notability-bar dan Wikipedia, maar items kunnen alsnog worden voorgedragen voor verwijdering als ze "geen onafhankelijke bronnen" hebben. Ter mitigatie:

- Voeg KvK-bron toe (officiële NL business registry = solid)
- Voeg eigen website + social media toe
- Indien mogelijk: 1-2 onafhankelijke vermeldingen (Sprout, Emerce, MKB Servicedesk artikel = ideaal)

Als item wordt voorgedragen voor verwijdering: voeg meer onafhankelijke bronnen toe en argumenteer notabiliteit als "Dutch tech business in active operation with KvK registration and public-facing services."

---

## Vervolgstappen na Wikidata-publicatie

1. **LinkedIn Company Page** — `linkedin.com/company/aanloop-ai` aanmaken (master plan target #2). Wikidata kan dan `LinkedIn company ID` (P4264) krijgen → extra grounding-link.
2. **Daan Verhoeven Q-item** — apart Person item creëren. Kan dan via "founded by" naar Aanloop AI Q-item linken. Bidirectionele entity-graph = sterkere grounding.
3. **GitHub Organization** — `github.com/aanloopai` officieel maken (al bestaand). Wikidata kan GitHub username (P2037) krijgen.
4. **BaseLayout schema update** — voeg Q-item URL toe aan Organization sameAs (zie Stap 5). Maakt cross-reference cycle compleet.

---

**Estimated tijd:** 30-45 minuten voor stap 1-5, daarna 24-72u wachten op indexering.

**Verwachte impact:** GEO-audit Brand Authority score +15-25 punten (van 52 naar 67-77). ChatGPT/Gemini/Perplexity entity-recognition unlock binnen 1-3 weken. Permanent multiplier op alle toekomstige AI-citations.
