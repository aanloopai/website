// Markdown-twins van de /geo-bureau/-pagina's voor AI-crawlers en -assistenten.
// Elke functie bouwt de tekst uit dezelfde databestanden als de HTML-pagina
// (src/data/geo-*.ts, pricing.ts), zodat HTML en Markdown nooit uiteenlopen.
// Prijzen komen uitsluitend uit pricing.ts via GEO_PRIJZEN; GEO Setup is "op aanvraag".
import { GEO_PRIJZEN } from '../data/geo-bureau';
import type { GeoRegio, GeoSbiSector } from '../data/geo-bureau';
import { GEO_BENCHMARK as B } from '../data/geo-benchmark';
import { KIEZEN, WATKOST } from '../data/geo-gids';
import { PILLAR_FAQ, PILLAR_STAPPEN, VERGELIJKEN_FAQ, GEO_PAGINA_DATUM, nl } from '../data/geo-pillar';

export const SITE = 'https://aanloopai.nl';
export const MD_HEADERS = { 'Content-Type': 'text/markdown; charset=utf-8' };

const eur = (n: number) => `€${n.toLocaleString('nl-NL')}`;

interface Faq { q: string; a: string }

const faqBlok = (faq: Faq[]) => `## Veelgestelde vragen\n\n${faq.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}`;

const prijzenBlok = () => [
  '## Tarieven',
  '',
  '- GEO Quick Scan: gratis',
  '- GEO Setup: eenmalig, op aanvraag',
  `- GEO Maandelijks: ${eur(GEO_PRIJZEN.maand)} per maand`,
  `- SEO + GEO Bundel: ${eur(GEO_PRIJZEN.bundel)} per maand`,
  '',
  'Alle bedragen exclusief 21% btw. Volledige tarieven: https://aanloopai.nl/tarieven/',
].join('\n');

const afsluiting = (pad: string) => `---\n\nBron: ${SITE}${pad}\nLaatst bijgewerkt: ${GEO_PAGINA_DATUM}\n`;

const bouw = (delen: string[], pad: string) => delen.filter(Boolean).join('\n\n') + '\n\n' + afsluiting(pad);

const benchmarkBron = () =>
  `Bron benchmark: ${B.naam} van ${B.uitgever}, editie ${B.editie}, methode ${B.methode}, ${B.bronUrl}, licentie ${B.licentie}. Gemeten op ${B.meetdatum}, gepubliceerd op ${B.publicatie}.`;

const lijst = (items: string[]) => items.map((q) => `- "${q}"`).join('\n');
const stappen = (items: { titel: string; body: string }[]) => items.map((a, i) => `${i + 1}. **${a.titel}**: ${a.body}`).join('\n');

export function regioMd(r: GeoRegio): string {
  return bouw([
    `# GEO-bureau ${r.naam}: vindbaar in ChatGPT en andere AI-assistenten`,
    `Aanloop AI is een GEO-bureau uit Rotterdam voor het MKB in ${r.provincies.join(', ')}. Wij zorgen dat AI-assistenten uw bedrijf noemen wanneer een klant in ${r.naam} erom vraagt, en meten dat elke maand.`,
    `## ${r.vraag}\n\n${r.antwoord}`,
    `## Zo zoekt het MKB in ${r.naam} via AI\n\n${r.markt.join('\n\n')}`,
    `## Vragen die klanten in ${r.naam} aan AI stellen\n\n${lijst(r.voorbeelden)}`,
    `## Werkgebied in ${r.naam}\n\nWe werken remote voor heel ${r.naam} en komen op locatie voor de intake en de oplevering. Steden waar we al actief zijn: ${r.steden.map((s) => s.naam).join(', ')}.`,
    prijzenBlok(),
    faqBlok(r.faq),
  ], `/geo-bureau/${r.slug}/`);
}

export function sectorMd(s: GeoSbiSector): string {
  return bouw([
    `# ${s.titel}`,
    s.intro,
    `## ${s.vraag}\n\n${s.antwoord}`,
    `## Vragen die klanten in deze sector aan AI stellen\n\n${lijst(s.voorbeelden)}`,
    `## Wat wij in deze sector concreet doen\n\n${stappen(s.aanpak)}`,
    s.verwant ? `Meer over AI voor deze branche: ${SITE}${s.verwant}` : '',
    `SBI-hoofdsectie ${s.sbi}: ${s.naam}.`,
    prijzenBlok(),
    faqBlok(s.faq),
  ], `/geo-bureau/sector/${s.slug}/`);
}

export function pillarMd(): string {
  return bouw([
    '# GEO-bureau voor het Nederlandse MKB',
    'Aanloop AI is een GEO-bureau in Rotterdam. Wij zorgen dat ChatGPT, Claude, Perplexity, Gemini en Google AI Overviews uw bedrijf noemen wanneer een klant om een leverancier vraagt, en we meten elke maand of dat lukt. Gratis Quick Scan, openbare maandtarieven, geen garantie op vermeldingen die niemand kan waarmaken.',
    `## Wat doet een GEO-bureau concreet?\n\n${stappen(PILLAR_STAPPEN)}`,
    '## GEO, AEO, LLMO of AI-SEO?\n\nVier namen voor hetzelfde vak. GEO (Generative Engine Optimization) is de meest gebruikte term, AEO (Answer Engine Optimization) legt de nadruk op het antwoord, LLMO op het taalmodel en AI-SEO op de verwantschap met klassieke SEO. Wij gebruiken GEO en, in het Nederlands, AI-vindbaarheid. Definities: https://aanloopai.nl/glossarium/',
    `## Onafhankelijke positie\n\n${B.naam} van ${B.uitgever}, editie ${B.editie}: Aanloop AI staat op plaats ${B.aanloop.plaats} van ${B.geplaatst}, met ${nl(B.aanloop.techniek)} van 100 op techniek en ${nl(B.aanloop.aanbod)} van 100 op transparantie van het aanbod. ${benchmarkBron()}`,
    prijzenBlok(),
    faqBlok(PILLAR_FAQ.map((f) => ({ q: f.question, a: f.answer }))),
  ], '/geo-bureau/');
}

export function kiezenMd(): string {
  return bouw([
    `# ${KIEZEN.titel}`,
    KIEZEN.intro,
    `## Zeven criteria voor een GEO-bureau\n\n${KIEZEN.criteria.map((c, i) => `### ${i + 1}. ${c.titel}\n\n${c.body}\n\nVraag aan het bureau: "${c.vraagAanBureau}"`).join('\n\n')}`,
    `## Rode vlaggen\n\n${KIEZEN.rodeVlaggen.map((r) => `- ${r}`).join('\n')}`,
    `## ${KIEZEN.specialistOfFullservice.vraag}\n\n${KIEZEN.specialistOfFullservice.antwoord}\n\n${KIEZEN.specialistOfFullservice.alinea.join('\n\n')}`,
    faqBlok(KIEZEN.faq),
  ], '/geo-bureau/kiezen/');
}

export function watKostMd(): string {
  return bouw([
    `# ${WATKOST.titel}`,
    WATKOST.intro,
    `## Waar u voor betaalt\n\n${WATKOST.kostenposten.map((k) => `### ${k.titel}\n\n${k.body}`).join('\n\n')}`,
    `## Drie prijsmodellen\n\n${WATKOST.modellen.map((m) => `### ${m.naam}\n\n${m.body}`).join('\n\n')}`,
    `## Wat GEO kost bij Aanloop AI\n\nAlle bedragen exclusief 21% btw. Volledige tarieven: https://aanloopai.nl/tarieven/\n\n${WATKOST.aanloop.map((a) => `- ${a.naam}: ${a.prijs === 0 ? 'gratis' : a.prijs === null ? 'op aanvraag' : eur(a.prijs)} (${a.eenheid}). ${a.body}`).join('\n')}`,
    `## Waarom prijzen tussen bureaus verschillen\n\n${WATKOST.waaromVerschilt.join('\n\n')}`,
    faqBlok(WATKOST.faq),
  ], '/geo-bureau/wat-kost-geo/');
}

export function vergelijkenMd(): string {
  const rij = (plaats: number, bureau: string, genoemd: number, techniek: number, aanbod: number, index: number) =>
    `| ${plaats} | ${bureau} | ${nl(genoemd)}% | ${nl(techniek)} | ${nl(aanbod)} | ${nl(index)} |`;
  const tabel = [
    '| # | Bureau | Genoemd | Techniek | Aanbod | Index |',
    '|---|---|---|---|---|---|',
    ...B.top10.map((r) => rij(r.plaats, r.bureau, r.genoemdPct, r.techniek, r.aanbod, r.index)),
    rij(B.aanloop.plaats, 'Aanloop AI', B.aanloop.genoemdPct, B.aanloop.techniek, B.aanloop.aanbod, B.aanloop.index),
  ].join('\n');
  return bouw([
    `# GEO-bureaus in Nederland vergeleken (${B.editie})`,
    `Welke GEO-bureaus noemen AI-assistenten het vaakst? De ${B.naam} van ${B.uitgever} meet dat maandelijks met ${B.vragen} vragen aan ${B.engines} AI-engines. Hieronder de top 10 van de editie ${B.editie} en onze eigen positie.`,
    `${benchmarkBron()} Volgende editie: ${B.volgende}.`,
    `## Top 10 volgens de index\n\nIndex van 0 tot 100: AI-vermeldingen ${B.weging.vermeldingen}%, techniek ${B.weging.techniek}%, transparantie van het aanbod ${B.weging.aanbod}%. "Genoemd" is het aandeel van de ${B.antwoorden.toLocaleString('nl-NL')} antwoorden waarin het bureau voorkomt.\n\n${tabel}\n\nCijfers overgenomen uit het rapport van ${B.editie} (methode ${B.methode}), ${B.rapportUrl}. Namen zijn handelsnamen van de bureaus; Aanloop AI heeft geen relatie met deze bureaus en ontvangt geen vergoeding voor vermelding.`,
    `## Waar AI zijn aanbevelingen vandaan haalt\n\nHerkomst van de bronnen onder de antwoorden die minstens een bureau noemen, volgens hetzelfde rapport:\n\n${B.bronnen.map((b) => `- ${nl(b.pct)}%: ${b.soort}`).join('\n')}`,
    `## Onze eigen positie\n\nAanloop AI staat op plaats ${B.aanloop.plaats} van ${B.geplaatst}, met een index van ${nl(B.aanloop.index)}. AI noemde ons in ${B.aanloop.genoemdAantal} antwoorden (${nl(B.aanloop.genoemdPct)}%). In de sector zorg en welzijn staan we op plaats ${B.aanloop.sectorZorgPlaats}.`,
    faqBlok(VERGELIJKEN_FAQ.map((f) => ({ q: f.question, a: f.answer }))),
  ], '/geo-bureau/vergelijken/');
}
