import type { APIRoute } from 'astro';
import { BEDRIJF } from '../data/bedrijfsgegevens';
import { GEO_BENCHMARK as B } from '../data/geo-benchmark';
import { GEO_REGIOS } from '../data/geo-regios';
import { GEO_SBI_SECTOREN } from '../data/geo-sbi-sectoren';
import { jsonResponse, FEITEN_GECONTROLEERD } from '../lib/facts-json';

const SITE = 'https://aanloopai.nl';

// Organisatiefeiten. Bewust zonder persoonsnamen (de oprichter wordt niet
// gepubliceerd) en zonder niet-gepubliceerde prijzen (zie /pricing.json).
const DIENSTEN = [
  { naam: 'Emma, AI-receptionist (telefoon, WhatsApp bij Groei en Compleet)', url: `${SITE}/diensten/emma/` },
  { naam: 'AI telefoon-assistent', url: `${SITE}/diensten/telefoon-assistent/` },
  { naam: 'AI chatbot voor websites', url: `${SITE}/diensten/ai-chatbot-website/` },
  { naam: 'AI e-mail assistent', url: `${SITE}/diensten/ai-email-assistent/` },
  { naam: 'AI lead qualification', url: `${SITE}/diensten/ai-lead-qualification/` },
  { naam: 'AI klantenservice omnichannel', url: `${SITE}/diensten/ai-klantenservice-omnichannel/` },
  { naam: 'AI document processing', url: `${SITE}/diensten/ai-document-processing/` },
  { naam: 'Custom AI workflows', url: `${SITE}/diensten/custom/` },
  { naam: 'AI strategie en audit', url: `${SITE}/diensten/audit/` },
  { naam: 'AI-vindbaarheid (GEO) en gratis GEO Quick Scan', url: `${SITE}/ai-vindbaarheid/` },
  { naam: 'GEO-bureau', url: `${SITE}/geo-bureau/` },
];

export const GET: APIRoute = () =>
  jsonResponse({
    schema: `${SITE}/facts.json`,
    laatst_gecontroleerd: FEITEN_GECONTROLEERD,
    organisatie: {
      naam: BEDRIJF.naam,
      juridische_naam: BEDRIJF.naam,
      kvk: BEDRIJF.kvk,
      plaats: BEDRIJF.stad,
      land: BEDRIJF.land,
      oprichtingsjaar: 2023,
      oprichtingsjaar_bron: `${SITE}/over/`,
      url: SITE,
      contact_email: BEDRIJF.email,
      taal: 'nl-NL',
      werkgebied: 'Nederland (remote, op locatie waar zinvol)',
    },
    diensten: DIENSTEN,
    sectoren: GEO_SBI_SECTOREN.map((s) => ({
      sbi: s.sbi,
      naam: s.naam,
      url: `${SITE}/geo-bureau/sector/${s.slug}/`,
      markdown: `${SITE}/geo-bureau/sector/${s.slug}.md`,
    })),
    regios: GEO_REGIOS.map((r) => ({
      naam: r.naam,
      provincies: r.provincies,
      url: `${SITE}/geo-bureau/${r.slug}/`,
      markdown: `${SITE}/geo-bureau/${r.slug}.md`,
    })),
    benchmark: {
      naam: B.naam,
      uitgever: B.uitgever,
      editie: B.editie,
      methode: B.methode,
      meetdatum: B.meetdatum,
      positie_aanloop_ai: B.aanloop.plaats,
      aantal_bureaus_geplaatst: B.geplaatst,
      index: B.aanloop.index,
      techniek: B.aanloop.techniek,
      transparantie_aanbod: B.aanloop.aanbod,
      bron_url: B.bronUrl,
      rapport_url: B.rapportUrl,
      licentie: B.licentie,
      vergelijking: `${SITE}/geo-bureau/vergelijken/`,
    },
    machineleesbaar: {
      prijzen: `${SITE}/pricing.json`,
      claims: `${SITE}/claims.json`,
      llms_txt: `${SITE}/llms.txt`,
      llms_full_txt: `${SITE}/llms-full.txt`,
      markdown_twins: 'Elke pagina onder /geo-bureau/ heeft een Markdown-versie op hetzelfde pad met .md erachter.',
    },
  });
