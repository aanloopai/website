# Outbound Cold Email + LinkedIn — Faz 1 (AanloopAI)

> Doel: binnen dagen leads genereren via gericht 1-op-1 outbound naar Nederlands MKB. Lead magnet = **gratis AI-scan** (`/gratis-ai-scan/`). Datum: 2026-06-12.

## ICP (ideaal klantprofiel)
- **Sectoren** (uit de AI-scan, hoogste pijn = telefoon/klantcontact): horeca, vastgoed & makelaars, accountancy, advocatuur, bouw & installatie, logistiek, zorg, e-commerce.
- **Grootte:** 6–50 FTE (genoeg volume om AI te rechtvaardigen, klein genoeg voor snelle beslissing).
- **Regio:** heel NL (begin Rotterdam/Zuid-Holland voor lokale hoek).
- **Beslisser:** eigenaar / directeur / operationeel manager / kantoormanager.
- **Trigger-signaal:** veel inkomende calls, klantenservice-team, "bel ons" op site zonder chat, vacature "telefoniste/receptie/klantenservice".

## Lijst-bronnen
- LinkedIn Sales Navigator (filter sector + bedrijfsgrootte + functie).
- KvK Handelsregister export (sector SBI-codes + regio).
- Sector-verenigingen / branchegidsen (KHN horeca, NVM makelaars, NBA accountants).
- Google Maps scrape per stad + sector (bedrijven met telefoon, zonder online afsprakentool).

## ⚠️ Deliverability & compliance (NIET overslaan)
- **Verstuur NIET vanaf `aanloopai.nl` of het Brevo-marketingaccount.** Cold volume verbrandt de domeinreputatie van je hoofddomein — precies het domein dat je transactionele leadmails (Brevo) moet beschermen. Brevo verbiedt bovendien cold/gekochte lijsten.
- **Gebruik een apart verzenddomein** (bv. `getaanloop.nl` of `aanloop-ai.nl`), met eigen SPF/DKIM/DMARC, **2 weken opgewarmd** vóór volume. Redirect het domein naar aanloopai.nl.
- **Tooling:** dedicated cold-email platform (Instantly / Smartlead / lemlist) — niet Brevo. Max **30–50 mails/dag per inbox**, 2-3 inboxen.
- **AVG/Telecommunicatiewet (B2B):** zakelijke cold email naar bedrijfsadressen mag onder *gerechtvaardigd belang* mits: relevant aanbod, herkenbare afzender (naam + KvK + adres), en **directe opt-out in elke mail**. Houd het 1-op-1 en gepersonaliseerd, geen massablast. Respecteer afmeldingen direct.
- **Warme leads** (form-submits, scan) gaan WEL via Brevo — dat is transactioneel/opt-in en blijft op aanloopai.nl.

## Sequence (5 touches over ~12 dagen)

**Personalisatie-tokens:** `{{voornaam}}` `{{bedrijf}}` `{{sector}}` `{{stad}}` `{{trigger}}`

### T1 — Dag 0 · Email (probleem + scan)
**Onderwerp A/B:**
- `Gemiste oproepen bij {{bedrijf}}?`
- `Vraagje over de telefoon bij {{bedrijf}}`
- `{{voornaam}}, AI-receptionist voor {{sector}}?`

```
Hoi {{voornaam}},

Korte vraag: hoeveel telefoontjes mist {{bedrijf}} per week buiten kantooruren of tijdens piek?

Bij veel {{sector}}-bedrijven loopt daar omzet weg — de beller probeert geen tweede keer, die belt de concurrent.

Wij bouwen voor het Nederlandse MKB een AI-receptionist die de telefoon 24/7 aanneemt, vragen beantwoordt en afspraken inplant. Nederlandstalig, AVG-compliant, EU-data. Vanaf €597/mnd.

Wilt u eerst weten of het bij u rendeert? Doe de gratis AI-scan (3 min) — u krijgt direct een score + concrete besparing voor uw sector:
https://aanloopai.nl/gratis-ai-scan/

Groet,
Mustafa — Aanloop AI · Rotterdam · KvK 88606902

[Afmelden: reply met "stop" en u hoort niets meer.]
```

### T2 — Dag 2 · LinkedIn connect (geen pitch)
> Connectieverzoek met notitie:
```
Hoi {{voornaam}}, ik help {{sector}}-bedrijven in NL met AI-receptionist & klantcontact-automatisering. Leek me nuttig om te connecten.
```

### T3 — Dag 4 · Email (ROI / concreet, reply op T1)
**Onderwerp:** `Re: Gemiste oproepen bij {{bedrijf}}?`
```
Hoi {{voornaam}},

Even concreet wat het oplevert: een team dat 15–20 uur/week kwijt is aan telefoon + repetitieve klantvragen, wint dat grotendeels terug. De AI neemt op, kwalificeert, plant in — uw mensen doen het werk dat telt.

Geen IT-project: kant-en-klaar, live binnen weken.

15 minuten kijken of het bij {{bedrijf}} past?
https://aanloopai.nl/demo-inplannen/

Groet, Mustafa
[Afmelden: reply "stop".]
```

### T4 — Dag 7 · LinkedIn DM (waarde, na geaccepteerde connect)
```
Dank voor het connecten, {{voornaam}}. Ik deel volgende week een korte case over een {{sector}}-bedrijf dat z'n gemiste calls naar ~0 bracht met een AI-receptionist. Interesse om 'm te ontvangen?
```

### T5 — Dag 12 · Email (break-up)
**Onderwerp:** `Zal ik het loslaten, {{voornaam}}?`
```
Hoi {{voornaam}},

Ik heb niets meer van u gehoord — geen probleem, timing is alles.

Mocht telefonische bereikbaarheid of klantcontact-automatisering ooit op tafel komen: de gratis AI-scan staat er, en u weet me te vinden.

https://aanloopai.nl/gratis-ai-scan/

Succes met {{bedrijf}}.
Mustafa — Aanloop AI
[Afmelden: reply "stop".]
```

## Sector-haakjes (vervang openingszin T1 per {{sector}})
- **Horeca:** "Hoeveel reserveringen mist u doordat de telefoon tijdens de service rinkelt?"
- **Vastgoed/makelaars:** "Hoeveel bezichtigingsaanvragen komen er binnen terwijl u onderweg bent?"
- **Accountancy:** "Hoeveel uur gaat er bij u zitten in repetitieve cliëntvragen rond deadlines?"
- **Zorg:** "Hoeveel patiënten/cliënten krijgen geen gehoor tijdens spreekuur?"
- **Bouw/installatie:** "Hoeveel offerteaanvragen blijven liggen omdat niemand de telefoon kan pakken op de bouw?"

## KPI / opvolging
- Mik op **30–50 prospects/dag/inbox**, ~150–250/week totaal.
- Benchmark: 40–60% open, 5–10% reply, 1–3% → scan/demo. Bij 250/week ≈ 3-7 leads/week om mee te starten.
- **Elke reply = warme lead** → direct naar Brevo CRM (`brevoUpsertContact`, met expliciete consent als ze de scan/demo doen).
- Meet in het cold-tool: reply rate per onderwerp + per sector; double-down op de winnende combinatie.
- Bounce > 5% → lijstkwaliteit slecht, verifieer e-mails (NeverBounce/ZeroBounce) vóór verzenden.
