# Reviews Collection Plan — Aanloop AI (echte reviews, geen fakes)

> GEO Track-2 user-action materiaal. Doel: legitiem echte klantreviews verzamelen op Google
> Business en Trustpilot, zodat later een onderbouwde AggregateRating-schema kan worden
> toegevoegd. Reviews + ratings versterken brand authority (#1 gap, 12/100) en trust-signalen
> voor AI-modellen.

## HARDE REGEL — nooit nepreviews
- Geen verzonnen reviews, geen reviews van vrienden/familie/medewerkers, geen gekochte reviews.
- Geen incentives die een review kopen (geen korting/cadeau "in ruil voor een 5-sterren-review").
  Een neutrale uitnodiging is toegestaan; een beloning gekoppeld aan de inhoud of het cijfer
  niet — dat is in strijd met de richtlijnen van Google en Trustpilot en met de wet (oneerlijke
  handelspraktijken).
- AggregateRating-schema mag pas op de site komen als er echte, publiek verifieerbare reviews
  bestaan die het gemiddelde en aantal exact onderbouwen. Tot die tijd: geen rating-schema.

---

## Stap 1 — Platforms voorbereiden
- **Google Business Profile:** zie `gbp-claim-checklist.md`. Reviews kunnen pas binnenkomen na
  verificatie. De review-link haal je in de GBP-beheeromgeving op ("Vraag om reviews" → korte
  link).
- **Trustpilot:** maak een gratis bedrijfsprofiel aan op business.trustpilot.com. Trustpilot
  geeft een uitnodigingslink en (op het gratis plan) een beperkt aantal uitnodigingen per maand.
- Bepaal één primair platform voor de eerste golf (advies: Google Business — grootste zichtbaar-
  heid en directe koppeling met de Knowledge Panel) en gebruik Trustpilot als tweede.

## Stap 2 — Wie benaderen
Maak een lijst van klanten die:
1. Minimaal 4-6 weken met Marco en/of Emma live zijn (genoeg ervaring voor een eerlijk oordeel).
2. Aantoonbaar tevreden zijn (positieve support-contacten, verlenging, geen open klachten).
3. Bereikbaar zijn via een persoonlijk contactpersoon.
Begin klein: 5-10 klanten in de eerste golf. Liever een paar oprechte reviews dan een massale
uitnodiging.

## Stap 3 — Timing
- **Beste moment:** kort na een positief ijkpunt — een geslaagde go-live, een maandrapportage
  met goede cijfers, of een tevreden support-interactie.
- **Cadans:** verstuur in golfjes van 5-10 uitnodigingen, niet alles tegelijk. Een plotselinge
  piek aan reviews oogt onnatuurlijk en kan door platforms worden gefilterd.
- **Opvolging:** maximaal één vriendelijke herinnering na ~7 dagen. Daarna loslaten.

## Stap 4 — Doelvolume (realistisch, gefaseerd)
| Fase | Periode | Doel Google | Doel Trustpilot |
|---|---|---|---|
| Golf 1 | Maand 1 | 3-5 reviews | 2-3 reviews |
| Golf 2 | Maand 2-3 | +5 reviews | +3-5 reviews |
| Doorlopend | per kwartaal | +3-5 reviews | +2-4 reviews |

> Richtpunt: ~10 echte Google-reviews maakt een AggregateRating geloofwaardig genoeg om
> schema toe te voegen. Forceer dit niet — het tempo volgt het echte klantenbestand.

## Stap 5 — Uitnodigingstemplates (Nederlands, neutraal geformuleerd)

### Template A — E-mail (Google Business)
```
Onderwerp: Zou je je ervaring met Aanloop AI willen delen?

Beste [voornaam],

Je werkt nu enkele weken met [Marco / Emma] en we horen graag hoe het je bevalt.

Zou je een korte review willen achterlaten over je ervaring met Aanloop AI? Het helpt andere
MKB-ondernemers om een eerlijk beeld te krijgen — of dat nu positief of kritisch is, alle
feedback is welkom.

Een review plaatsen kan hier (kost ongeveer een minuut):
[Google review-link]

Hartelijk dank voor de tijd.

Met vriendelijke groet,
Mustafa Agah Dogan
Aanloop AI
```

### Template B — WhatsApp / kort bericht (Google Business)
```
Hoi [voornaam], je werkt nu een tijdje met [Marco/Emma]. Zou je je ervaring met Aanloop AI
willen delen in een korte review? Eerlijke feedback — goed of kritisch — helpt andere
ondernemers enorm. Hier kan het: [Google review-link]. Alvast bedankt!
```

### Template C — E-mail (Trustpilot)
```
Onderwerp: Je mening over Aanloop AI op Trustpilot

Beste [voornaam],

We zouden je ervaring met Aanloop AI graag terugzien op Trustpilot. Daar lezen ondernemers die
overwegen met AI te starten graag echte verhalen van andere bedrijven.

Een review achterlaten kan via deze link: [Trustpilot uitnodigingslink]

Schrijf gerust precies wat je vindt — eerlijke, ongekleurde feedback is het waardevolst.

Dank je wel.

Met vriendelijke groet,
Mustafa Agah Dogan
Aanloop AI
```

### Template D — Herinnering (één keer, na ~7 dagen)
```
Onderwerp: Kleine herinnering — je review voor Aanloop AI

Beste [voornaam],

Misschien is het er nog niet van gekomen — geen probleem. Mocht je een momentje hebben, dan
stellen we een korte, eerlijke review nog steeds erg op prijs:
[review-link]

En als je geen review wilt achterlaten, is dat ook helemaal goed. Bedankt hoe dan ook.

Met vriendelijke groet,
Mustafa Agah Dogan
Aanloop AI
```

## Stap 6 — Reageren op reviews
- Reageer op **elke** review binnen enkele dagen — ook op kritische.
- Positief: kort en oprecht bedanken, geen verkooppraat.
- Kritisch: erken het punt, bied een oplossing of contactmoment aan, blijf zakelijk en
  professioneel. Een goede reactie op een kritische review werkt vaak vertrouwenwekkender dan
  alleen 5-sterren-reacties.

## Stap 7 — AggregateRating-schema (PAS HIERNA)
Zodra er voldoende echte reviews zijn:
1. Tel het werkelijke aantal reviews en het werkelijke gemiddelde op het gekozen platform.
2. Voeg `AggregateRating` toe aan het relevante schema in de site-codebase
   (Organization of een Product/Service-type, bv. in `BaseLayout.astro` of de
   diensten-pagina's voor Marco/Emma).
3. Vul **exact** het echte `ratingValue`, `reviewCount`/`ratingCount`, `bestRating` en
   `worstRating` in — geen afgeronde of opgepoetste cijfers.
4. Werk het cijfer periodiek bij wanneer het aantal reviews verandert; verouderde
   rating-schema is misleidend.
5. Optioneel: voeg enkele echte review-citaten met naam/bedrijf toe als `Review`-items —
   uitsluitend met expliciete toestemming van de klant.

## Stap 8 — Tracking
Houd een eenvoudige lijst bij: klant, platform, datum uitnodiging, datum herinnering, status
(geplaatst / niet / geweigerd), review-URL. Zo blijft het overzichtelijk en wordt niemand
dubbel benaderd.

---

## Samenvatting
Echte reviews, in een natuurlijk tempo, op Google Business en Trustpilot — daarna pas een
eerlijk AggregateRating-schema. Geen enkele uitzondering op de no-fake-regel.
