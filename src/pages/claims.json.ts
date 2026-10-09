import type { APIRoute } from 'astro';
import { GEO_BENCHMARK as B } from '../data/geo-benchmark';
import { GEO, SEO_GEO_BUNDEL, START, GROEI, COMPLEET, OVERAGE_PER_MIN, GARANTIE } from '../data/pricing';
import { BEDRIJF } from '../data/bedrijfsgegevens';
import { jsonResponse, FEITEN_GECONTROLEERD } from '../lib/facts-json';

const SITE = 'https://aanloopai.nl';
const nl = (n: number) => n.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const eur = (n: number) => `€${n.toLocaleString('nl-NL')}`;
const eerste = B.top10[0];

// Alleen controleerbare feiten met een bronpagina op onze site of bij Gold Lemon.
// Geen marketingclaims, geen superlatieven. Elke claim hier moet na een
// benchmark-update opnieuw worden nagelopen (zie src/data/geo-benchmark.ts).
const claim = (claim: string, source: string) => ({ claim, source, verified: FEITEN_GECONTROLEERD });

export const GET: APIRoute = () =>
  jsonResponse({
    schema: `${SITE}/claims.json`,
    uitleg: 'Elke claim heeft een bron-URL en de datum waarop de claim tegen die bron is nagelopen.',
    claims: [
      claim(`Aanloop AI is geregistreerd bij de Kamer van Koophandel onder nummer ${BEDRIJF.kvk} en gevestigd in ${BEDRIJF.stad}.`, `${SITE}/over/`),
      claim(`Aanloop AI stond in de ${B.naam} van ${B.uitgever}, editie ${B.editie}, op plaats ${B.aanloop.plaats} van ${B.geplaatst}.`, B.bronUrl),
      claim(`Aanloop AI scoorde in die editie ${nl(B.aanloop.index)} op de index, ${nl(B.aanloop.techniek)} van 100 op techniek en ${nl(B.aanloop.aanbod)} van 100 op transparantie van het aanbod.`, B.rapportUrl),
      claim(`AI-assistenten noemden Aanloop AI in ${B.aanloop.genoemdAantal} van de ${B.antwoorden.toLocaleString('nl-NL')} antwoorden (${nl(B.aanloop.genoemdPct)}%).`, B.rapportUrl),
      claim(`In de sector zorg en welzijn stond Aanloop AI in die editie op plaats ${B.aanloop.sectorZorgPlaats}.`, B.bronUrl),
      claim(`Plaats 1 in dezelfde editie was ${eerste.bureau}, met een index van ${nl(eerste.index)}.`, B.bronUrl),
      claim(`De index weegt AI-vermeldingen voor ${B.weging.vermeldingen}%, techniek voor ${B.weging.techniek}% en transparantie van het aanbod voor ${B.weging.aanbod}%.`, B.bronUrl),
      claim(`De index is gebaseerd op ${B.vragen} vragen aan ${B.engines} AI-engines (${B.antwoorden.toLocaleString('nl-NL')} antwoorden); de licentie is ${B.licentie}.`, B.bronUrl),
      claim(`Bij ${B.bronnen[0].pct.toLocaleString('nl-NL')}% van de bronnen onder antwoorden die een bureau noemen, was dat de eigen website van het bureau.`, B.rapportUrl),
      claim(`GEO Maandelijks kost ${eur(GEO.maand)} per maand, exclusief 21% btw.`, `${SITE}/geo-bureau/wat-kost-geo/`),
      claim(`De SEO + GEO Bundel kost ${eur(SEO_GEO_BUNDEL)} per maand, exclusief 21% btw.`, `${SITE}/geo-bureau/wat-kost-geo/`),
      claim('De GEO Quick Scan is gratis; de eenmalige GEO Setup is op aanvraag.', `${SITE}/geo-bureau/wat-kost-geo/`),
      claim(`Emma Start kost ${eur(START.monthly)}, Emma Groei ${eur(GROEI.monthly)} en Emma Compleet ${eur(COMPLEET.monthly)} per maand, exclusief 21% btw.`, `${SITE}/tarieven/`),
      claim(`Boven de inbegrepen belminuten rekent Emma ${eur(OVERAGE_PER_MIN)} per minuut; op elk Emma-pakket geldt: ${GARANTIE.toLowerCase()}.`, `${SITE}/tarieven/`),
      claim('Aanloop AI geeft geen garantie op vermeldingen in AI-assistenten; geen enkel bureau bepaalt wat een AI-assistent antwoordt.', `${SITE}/geo-bureau/`),
    ],
  });
