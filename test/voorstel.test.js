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
});
