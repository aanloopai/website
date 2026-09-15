import { describe, it, expect } from 'vitest';
import { buildVoorstelData, prijsVoorEntry } from '../src/lib/voorstel.js';
import { getFunnelEntry } from '../src/data/funnel-map.ts';

const ANSWERS = { gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' };
const CUSTOMER = { name: 'Jan', company: 'Jansen Installatie', email: 'jan@example.nl' };

describe('buildVoorstelData', () => {
  it('haalt de prijs uit de catalogus, niet uit een model', () => {
    const p = prijsVoorEntry(getFunnelEntry('voice-agent'));
    expect(p.prijsCent).toBe(29900); // Groei
    expect(p.setupCent).toBe(49500);
  });

  it('valt terug op statische copy als er geen LLM-sleutel is', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS });
    expect(data.copy.bronnen).toBe('fallback');
    expect(data.copy.kop).toBe(getFunnelEntry('voice-agent').fallbackKop);
    expect(data.prijsCent).toBe(29900);
    expect(data.roi.modus).toBe('punt');
  });

  it('valt terug op statische copy als de LLM faalt', async () => {
    const env = { GEMINI_API_KEY: 'x' };
    const llm = async () => { throw new Error('boom'); };
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS }, { llm });
    expect(data.copy.bronnen).toBe('fallback');
  });

  it('gebruikt LLM-copy wanneer die er is, maar nooit voor de prijs', async () => {
    const env = { GEMINI_API_KEY: 'x' };
    const llm = async () => JSON.stringify({ kop: 'Eigen kop', tekst: 'Eigen tekst van 30 tekens minimaal.' });
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS }, { llm });
    expect(data.copy.bronnen).toBe('llm');
    expect(data.copy.kop).toBe('Eigen kop');
    expect(data.prijsCent).toBe(29900);
  });

  it('weigert een niet-verkoopbare dienst', async () => {
    await expect(
      buildVoorstelData({}, { serviceId: 'whatsapp-bot', customer: CUSTOMER, answers: {} }),
    ).rejects.toThrow(/niet verkoopbaar/i);
  });

  it('weigert LLM-copy met een €-bedrag in de tekst en valt terug op statisch', async () => {
    const env = { GEMINI_API_KEY: 'x' };
    const llm = async () => JSON.stringify({
      kop: 'Geldige kop hier',
      tekst: 'Dit kost €497 per maand voor het pakket in totaal.',
    });
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS }, { llm });
    expect(data.copy.bronnen).toBe('fallback');
    expect(data.copy.kop).toBe(getFunnelEntry('voice-agent').fallbackKop);
  });

  it('weigert LLM-copy met een percentage en valt terug op statisch', async () => {
    const env = { GEMINI_API_KEY: 'x' };
    const llm = async () => JSON.stringify({
      kop: 'Geldige kop hier',
      tekst: 'Wij besparen u 30% op uw huidige kosten per maand gegarandeerd.',
    });
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS }, { llm });
    expect(data.copy.bronnen).toBe('fallback');
    expect(data.copy.kop).toBe(getFunnelEntry('voice-agent').fallbackKop);
  });

  it('weigert LLM-copy met een bedrag in de kop en valt terug op statisch', async () => {
    const env = { GEMINI_API_KEY: 'x' };
    const llm = async () => JSON.stringify({
      kop: 'Bespaar nu €497 per maand',
      tekst: 'Dit is een tekst zonder bedrag maar wel dertig tekens lang genoeg.',
    });
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS }, { llm });
    expect(data.copy.bronnen).toBe('fallback');
    expect(data.copy.kop).toBe(getFunnelEntry('voice-agent').fallbackKop);
  });

  it.each([
    'een investering van 497,- per maand',
    'slechts 497,- per maand',
    'vanaf 497,- per maand',
    '497,-/maand',
  ])('weigert LLM-copy met NL-prijsnotatie ",-" zonder euroteken: %s', async (zin) => {
    const env = { GEMINI_API_KEY: 'x' };
    const llm = async () => JSON.stringify({
      kop: 'Geldige kop hier',
      tekst: `Dit pakket kost ${zin} in totaal excl. btw.`,
    });
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS }, { llm });
    expect(data.copy.bronnen).toBe('fallback');
    expect(data.copy.kop).toBe(getFunnelEntry('voice-agent').fallbackKop);
  });

  it('accepteert LLM-copy met een toegestaan aantal (geen bedrag)', async () => {
    const env = { GEMINI_API_KEY: 'x' };
    const llm = async () => JSON.stringify({
      kop: 'Geldige koptekst hier',
      tekst: 'U mist 22 gemiste gesprekken per maand aan potentiele klanten helaas.',
    });
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS }, { llm });
    expect(data.copy.bronnen).toBe('llm');
    expect(data.copy.tekst).toContain('22 gemiste gesprekken per maand');
  });
});

// 2026-09-15: /tarieven/ "Emma Start €149" stuurde naar /start/, waar de enige
// verkoopbare dienst (voice-agent) een Groei-voorstel (€299 + setup) opleverde.
// De gekozen ladder-trede reist nu mee als `tierNaam`; de prijs blijft uit de
// catalogus komen. Onbekende of onbetaalbare tiers vallen terug op de funnel-
// default, nooit op een verzonnen bedrag.
describe('buildVoorstelData — gekozen tier van /tarieven/', () => {
  it('Starter: €149/mnd en GEEN setup (pricing.ts START_SETUP = 0)', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS, tierNaam: 'Starter' });
    expect(data.tierNaam).toBe('Starter');
    expect(data.prijsCent).toBe(14900);
    expect(data.setupCent).toBe(0);
  });

  it('Compleet: €497/mnd + setup uit pricing.ts', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS, tierNaam: 'Compleet' });
    expect(data.tierNaam).toBe('Compleet');
    expect(data.prijsCent).toBe(49700);
    expect(data.setupCent).toBe(79500);
  });

  it('onbekende tier valt terug op de funnel-default (Groei), geen fout', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS, tierNaam: 'Platinum' });
    expect(data.tierNaam).toBe('Groei');
    expect(data.prijsCent).toBe(29900);
  });

  it('tier zonder prijs (Partner/op aanvraag) valt terug op de funnel-default', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS, tierNaam: 'Partner' });
    expect(data.tierNaam).toBe('Groei');
    expect(data.prijsCent).toBe(29900);
  });

  it('zonder tierNaam blijft het gedrag ongewijzigd (Groei)', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS });
    expect(data.tierNaam).toBe('Groei');
    expect(data.setupCent).toBe(49500);
  });

  it('setup-tabel volgt pricing.ts voor elke trede — Starter mag nooit de Compleet-setup erven', () => {
    expect(prijsVoorEntry({ productKey: 'emma-telefoon', tierNaam: 'Starter' }).setupCent).toBe(0);
    expect(prijsVoorEntry({ productKey: 'emma-telefoon', tierNaam: 'Groei' }).setupCent).toBe(49500);
    expect(prijsVoorEntry({ productKey: 'emma-telefoon', tierNaam: 'Compleet' }).setupCent).toBe(79500);
  });
});
