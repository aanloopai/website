import type { APIRoute } from 'astro';
import {
  START, GROEI, COMPLEET, GEO, SEO_GEO_BUNDEL, OVERAGE_PER_MIN, GARANTIE,
  START_SETUP_LABEL, SETUP_DISPLAY,
} from '../data/pricing';
import { BTW_TARIEF } from '../data/bedrijfsgegevens';
import { jsonResponse, FEITEN_GECONTROLEERD } from '../lib/facts-json';

// Alleen prijzen die openbaar op /tarieven/ en /geo-bureau/ staan. Eenmalige
// setupbedragen (Emma Groei/Compleet, GEO Setup) worden bewust NIET gepubliceerd:
// daar staat "op aanvraag". Guard: test/geo-bureau.test.js.
const mnd = (naam: string, prijs: number, url: string, extra: Record<string, unknown> = {}) => ({
  naam,
  prijs_per_maand_excl_btw: prijs,
  valuta: 'EUR',
  url,
  ...extra,
});

export const GET: APIRoute = () =>
  jsonResponse({
    organisatie: 'Aanloop AI',
    valuta: 'EUR',
    btw: { tarief: BTW_TARIEF, opmerking: 'Alle bedragen zijn exclusief 21% btw.' },
    bron: 'https://aanloopai.nl/tarieven/',
    laatst_gecontroleerd: FEITEN_GECONTROLEERD,
    emma_ai_receptie: {
      uitleg: 'Emma is de AI-telefoniste van Aanloop AI. WhatsApp zit inbegrepen bij Groei en Compleet.',
      url: 'https://aanloopai.nl/diensten/emma/',
      pakketten: [
        mnd('Emma Start', START.monthly, 'https://aanloopai.nl/tarieven/', { belminuten_inbegrepen: 300, setup: START_SETUP_LABEL }),
        mnd('Emma Groei', GROEI.monthly, 'https://aanloopai.nl/tarieven/', { belminuten_inbegrepen: 1000, setup: SETUP_DISPLAY }),
        mnd('Emma Compleet', COMPLEET.monthly, 'https://aanloopai.nl/tarieven/', { belminuten_inbegrepen: 'onbeperkt volume', setup: SETUP_DISPLAY }),
      ],
      extra_belminuut_excl_btw: OVERAGE_PER_MIN,
      garantie: GARANTIE,
    },
    geo: {
      uitleg: 'GEO (Generative Engine Optimization): vindbaar worden in ChatGPT, Claude, Perplexity, Gemini en Google AI.',
      url: 'https://aanloopai.nl/geo-bureau/wat-kost-geo/',
      diensten: [
        { naam: 'GEO Quick Scan', prijs_excl_btw: 0, valuta: 'EUR', eenheid: 'gratis', url: 'https://aanloopai.nl/ai-vindbaarheid/check/' },
        { naam: 'GEO Setup', prijs_excl_btw: null, eenheid: 'eenmalig, op aanvraag', url: 'https://aanloopai.nl/contact/?type=offerte&dienst=geo-setup' },
        mnd('GEO Maandelijks', GEO.maand, 'https://aanloopai.nl/geo-bureau/wat-kost-geo/'),
        mnd('SEO + GEO Bundel', SEO_GEO_BUNDEL, 'https://aanloopai.nl/geo-bureau/wat-kost-geo/'),
      ],
    },
  });
