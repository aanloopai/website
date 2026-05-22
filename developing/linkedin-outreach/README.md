# LinkedIn Outreach Kit — Aanloop AI

Legaal B2B-outreachsysteem voor het Nederlandse MKB. Vervangt het idee om de
127k FleetTrackHolland e-mailadressen te hergebruiken — dat is een GDPR-
overtreding (doelbinding, art. 5(1)(b)) en strijdig met de Telecommunicatiewet
art. 11.7 (opt-in verplicht). LinkedIn is een legaal kanaal: persoonlijk,
1-op-1, geen opt-in vereist binnen het platform.

## ⚠️ Belangrijk — geen automatisering

Connection-requests en DM's worden **handmatig** verstuurd. Tools die dit
automatiseren (Dux-Soup, Phantombuster, LinkedHelper e.d.) zijn in strijd met
de LinkedIn User Agreement en leiden tot accountschorsing. Dit kit levert
**productie + tracking**, geen verzendautomatisering.

## Workflow

1. **Persona kiezen** — `target-personas.md`: kies een sector + rol voor de week.
2. **Lijst vullen** — `target-list.csv`: voeg 20-30 prospects per week toe via
   LinkedIn-zoeken / Sales Navigator (filter op functie, sector, regio, grootte).
3. **Verbinden** — stuur connection-request met gepersonaliseerde notitie
   (template 1 uit `message-templates.md`).
4. **Opvolgen** — na acceptatie: template 2 (kennismaking), daarna waarde-
   bericht (3), afspraak-vraag (4), follow-up (5). Nooit pitchen in request.
5. **Tracken** — werk `status` + `laatste_actie` + `datum_contact` bij in de CSV.
6. **Meten** — wekelijks: verzonden / geaccepteerd / beantwoord / afspraak.

## Cadans

Zie `cadence.md`. Vuistregel: max ~20-25 connection-requests per dag (handmatig),
verspreid over de dag. Outreach-dagen afstemmen op de content-kalender
(`marketing/linkedin/wave-1-schedule.json`) zodat een prospect die je benadert
een actief, geloofwaardig profiel ziet.

## Bestanden

| Bestand | Doel |
|---|---|
| `target-personas.md` | Wie benaderen we — sectoren, rollen, bedrijfsgrootte |
| `target-list.csv` | Werklijst met prospects + status-tracking |
| `message-templates.md` | 5 NL-berichtsjablonen met personalisatie-tokens |
| `cadence.md` | Dag-/weekritme, veilige limieten, Eisenhower-indeling |

## Wekelijkse KPI's

| Metriek | Doel (richtlijn) |
|---|---|
| Connection-requests verzonden | 100-125 / week |
| Acceptatieratio | > 30% |
| Reactieratio (op bericht na acceptatie) | > 15% |
| Afspraken (demo / strategiegesprek) | 3-5 / week |

Logboek bijhouden onderaan `cadence.md`.
