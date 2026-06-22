# Wikidata — Aanloop AI Q-item (paste-ready QuickStatements)

> Entity-autoriteit voor GEO: een Wikidata-item helpt AI-assistenten je als bedrijf te herkennen. Submit = ~5 min via QuickStatements. **Jij voert dit uit** (Wikidata-login vereist).

## Vooraf (verplicht)
1. **Maak eerst minimaal 2 referenties live** (LinkedIn company page + 1-2 directories) — Wikidata-notability/COI vraagt onafhankelijke bronnen. Zonder referenties wordt het item mogelijk verwijderd.
2. **COI-disclosure:** je bent zelf de organisatie. Vermeld dit op je Wikidata-gebruikerspagina en op de item-talkpage ("Ik ben verbonden aan Aanloop AI").
3. **Verifieer de Q-ids hieronder** op wikidata.org voor het runnen (type- en eigenschap-ids kunnen afwijken).

## Stap
1. Ga naar **https://quickstatements.toolforge.org/** -> log in met je Wikidata-account -> "New batch" -> "Import V1 commands".
2. Plak het blok hieronder. 3. "Run".

## QuickStatements V1 (CREATE nieuw item)
```
CREATE
LAST	Lnl	"Aanloop AI"
LAST	Len	"Aanloop AI"
LAST	Lde	"Aanloop AI"
LAST	Dnl	"Nederlands AI-bureau voor het MKB, gevestigd in Rotterdam"
LAST	Den	"Dutch AI agency for SMEs, based in Rotterdam"
LAST	P31	Q4830453
LAST	P452	Q11660
LAST	P17	Q55
LAST	P131	Q34370
LAST	P159	Q34370
LAST	P571	+2023-00-00T00:00:00Z/9
LAST	P1454	Q1480166
LAST	P3548	"88606902"
LAST	P856	"https://aanloopai.nl"
```

### Wat elke regel doet (verifieer Q-ids)
| Eigenschap | Betekenis | Waarde |
|---|---|---|
| `Lnl/Len/Lde` | Label (NL/EN/DE) | Aanloop AI |
| `Dnl/Den` | Omschrijving | zie boven |
| `P31` instance of | business | `Q4830453` |
| `P452` industry | kunstmatige intelligentie | `Q11660` |
| `P17` country | Nederland | `Q55` |
| `P131` located in | Rotterdam | `Q34370` |
| `P159` headquarters location | Rotterdam | `Q34370` |
| `P571` inception | 2023 (jaar-precisie /9) | `+2023-00-00T00:00:00Z/9` |
| `P1454` legal form | besloten vennootschap (BV) | `Q1480166` |
| `P3548` KvK-nummer | (NL handelsregister) | `88606902` |
| `P856` official website | | `https://aanloopai.nl` |

## NA aanmaken
- Voeg de nieuwe `Q-id` toe aan de `sameAs`-array in `src/layouts/BaseLayout.astro` (Organization-schema) — versterkt de entiteit-koppeling.
- Geen apart persoon-item voor de oprichter aanmaken tenzij notabel (eigen artikelen/pers). Voorkomt verwijdering wegens non-notability.
- Voeg later toe wanneer beschikbaar: `P2013` (Facebook), `P4264` (LinkedIn company), `P2003` (Instagram -> aanloop.ai).

## Niet doen
- Geen verzonnen claims (geen klantaantallen, geen awards).
- Geen "Daan Verhoeven" — oprichter is **Mustafa Agah Dogan**.
- KvK = **88606902** (niet 88606902).
