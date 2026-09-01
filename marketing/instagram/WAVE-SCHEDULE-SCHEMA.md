# Wave-schedule schema — `wave-N-schedule.json`

Referentie voor het handmatig of geautomatiseerd aanmaken van een nieuwe
contentwave voor `@aanloop.ai`. Afgeleid uit `scripts/validate-ig-schedule.mjs`
(de enige autoriteit — bij twijfel wint de validator, niet dit document) en uit
het laatst gepubliceerde bestand `wave-10-schedule.json`.

Valideer altijd voordat je commit:

```bash
node scripts/validate-ig-schedule.mjs marketing/instagram/wave-11-schedule.json
```

Exit 0 = geldig. De publish-workflow draait deze validator als eerste stap.

---

## Bestandsnaam

| Patroon | Opgepakt door publisher | Opmerking |
|---|---|---|
| `wave-N-schedule.json` | ja | standaard feed-wave |
| `wave-N-weekM-schedule.json` | ja | opgesplitste wave |
| `wave-N-reels-schedule.json` | nee (aparte reels-publisher) | zie `REELS-PIPELINE.md` |
| `*.archived` | nee | uit de rotatie gehaald |

`scripts/ig-publish.mjs` kiest automatisch het **laagste wave-nummer met nog
openstaande slots**. Een nieuwe wave wordt dus vanzelf opgepakt zodra het bestand
bestaat — er hoeft geen config aangepast te worden.

> Let op: de validator (`findSchedules()`) pakt zonder pad-argument alleen
> `wave-N-schedule.json` op, niet de `-weekM-` variant. Geef die expliciet mee.

---

## Top-level velden

| Veld | Type | Verplicht | Betekenis |
|---|---|---|---|
| `wave` | number | ja | wavenummer; moet overeenkomen met de bestandsnaam. Bepaalt de opvolgvolgorde |
| `timezone` | string | ja | altijd `"Europe/Amsterdam"` |
| `cadence` | string | ja | leesbare omschrijving, bv. `"Daily 09:00 CEST (1 post/dag, ma-vr, 2 weken)"` |
| `ig_user_id` | string | ja | IG Business User ID; fallback wanneer de secret `IG_USER_ID` leeg is |
| `image_base_url` | string | ja | basis-URL voor de afbeeldingen, zonder slash aan het eind |
| `posts` | array | ja | de slots, chronologisch op `slot_iso` |
| `_comment` | string | nee | redactionele toelichting op de boog van de wave |

`image_base_url` wijst naar de raw-GitHub-map:
`https://raw.githubusercontent.com/aanloopai/website/master/public/social-feed`.
Meta haalt de afbeelding zelf op, dus de URL moet **publiek bereikbaar zijn op het
moment van publiceren** — de afbeelding moet dus al gecommit en gepusht zijn.

---

## Post-velden

### Altijd verplicht

| Veld | Type | Regel (validator) |
|---|---|---|
| `id` | string | niet leeg, uniek binnen de wave. Conventie: `w{N}-p{NN}-{korte-slug}` |
| `slot_iso` | string | parsebare ISO-8601 **met expliciete TZ-offset** |
| `caption` | string | 1–2200 tekens (IG-limiet). Max 30 hashtags, waarschuwing vanaf 20 |
| `format` | string | `"single"` of `"carousel"` |

### Afhankelijk van `format`

| `format` | Vereist | Regel |
|---|---|---|
| `"single"` | `image` | bestand moet bestaan in `public/social-feed/{image}` |
| `"carousel"` | `slides` | array van 2–10 items, elk verwijzend naar een bestaand bestand |

### Redactioneel (niet door de validator afgedwongen)

`pillar`, `template`, `hook`, `cta`, `cta_keyword`, `story_enabled`, en
template-specifieke blokken zoals `qa`, `steps`, `quotes`, `reveal`,
`data_points`, `metrics`, `source`. Deze sturen de vormgeving, niet de publicatie.

Gebruikte `template`-waarden in wave 10: `editorial` en varianten per postsoort.
Neem een bestaande post als voorbeeld in plaats van een nieuwe naam te verzinnen —
een onbekende template wordt bij het renderen stil overgeslagen.

---

## Tijdzone-regel voor `slot_iso`

De offset is **verplicht** en moet de werkelijke Nederlandse offset op die datum zijn:

- zomertijd (CEST, eind maart – eind oktober): `+02:00`
- wintertijd (CET, eind oktober – eind maart): `+01:00`

```json
"slot_iso": "2026-08-17T09:00:00+02:00"
```

Een slot zonder offset wordt afgekeurd. Een slot met de verkeerde offset wordt
niet afgekeurd maar publiceert een uur ernaast — controleer dit bij waves die
over een tijdzonewissel heen lopen.

De cron draait vier keer per dag (07/08/15/16 UTC) om zowel CET als CEST te dekken.
Een slot wordt gepubliceerd bij de eerste run **op of na** `slot_iso`.

---

## `posted_at` — hoe een slot als gepubliceerd wordt gemarkeerd

Drie velden horen bij elkaar en worden door de validator als groep gecontroleerd:

| Toestand | `posted_at` | `media_id` | `permalink` |
|---|---|---|---|
| nog te publiceren | `null` | `null` | `null` |
| gepubliceerd | ISO-8601 UTC | IG media-ID | IG-permalink |

**Alle drie null, of alle drie gevuld.** Een half ingevulde combinatie is een
validatiefout.

Bij een nieuwe wave zet je alle drie op `null`. De publisher vult ze zelf in en
commit het bestand terug naar `master` (stap "Commit schedule update"). Vul ze
dus nooit handmatig in — de publisher is idempotent en slaat een slot met een
gevulde `posted_at` over, waardoor een handmatige waarde de post permanent blokkeert.

---

## Wat er gebeurt als de voorraad op is

Wanneer elk slot in de laatste wave `posted_at` heeft en er geen hoger wavenummer
bestaat, logt `ig-publish.mjs` `CONTENT SUPPLY EMPTY` en **eindigt met exit 0** —
een lege contentplanning is geen storing van de publisher. Het signaal loopt via
de workflow `IG Supply Watch`, die dagelijks het issue met label `ig-supply-low`
opent of bijwerkt en het sluit zodra er weer voorraad is.

Echte fouten (ontbrekend token, Graph-API-fout, ongeldig schedule) blijven exit 1/2
en maken de workflow wel rood.
