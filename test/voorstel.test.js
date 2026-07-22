import { describe, it, expect } from 'vitest';
import { buildVoorstelData, prijsVoorEntry } from '../src/lib/voorstel.js';
import { getFunnelEntry } from '../src/data/funnel-map.ts';

const ANSWERS = { gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' };
const CUSTOMER = { name: 'Jan', company: 'Jansen Installatie', email: 'jan@example.nl' };

describe('buildVoorstelData', () => {
  it('haalt de prijs uit de catalogus, niet uit een model', () => {
    const p = prijsVoorEntry(getFunnelEntry('voice-agent'));
    expect(p.prijsCent).toBe(49700);
    expect(p.setupCent).toBe(49500);
  });

  it('valt terug op statische copy als er geen LLM-sleutel is', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS });
    expect(data.copy.bronnen).toBe('fallback');
    expect(data.copy.kop).toBe(getFunnelEntry('voice-agent').fallbackKop);
    expect(data.prijsCent).toBe(49700);
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
    expect(data.prijsCent).toBe(49700);
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
