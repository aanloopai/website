import { describe, it, expect } from 'vitest';
import { berekenRoi, WEKEN_PER_MAAND, CONVERSIE_PUNT } from '../src/lib/roi.js';

describe('berekenRoi', () => {
  it('rekent een puntschatting als beide inputs er zijn', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' });
    expect(r.modus).toBe('punt');
    expect(r.gemistPerMaand).toBe(Math.round(5 * WEKEN_PER_MAAND));
    expect(r.verliesPerMaandCent).toBe(Math.round(5 * WEKEN_PER_MAAND * CONVERSIE_PUNT * 400 * 100));
  });

  it('geeft een bereik wanneer de klantwaarde ontbreekt', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: '5' });
    expect(r.modus).toBe('bereik');
    expect(r.verliesLaagCent).toBeGreaterThan(0);
    expect(r.verliesHoogCent).toBeGreaterThan(r.verliesLaagCent);
    expect(r.verliesPerMaandCent).toBe(null);
  });

  it('verzint niets als er geen bruikbare input is', () => {
    const r = berekenRoi({});
    expect(r.modus).toBe('geen');
    expect(r.gemistPerMaand).toBe(null);
    expect(r.verliesPerMaandCent).toBe(null);
  });

  it('negeert onzin-input in plaats van NaN te produceren', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: 'veel', gemiddelde_klantwaarde: '-3' });
    expect(r.modus).toBe('geen');
  });

  it('begrenst absurde invoer', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: '100000', gemiddelde_klantwaarde: '999999' });
    expect(r.gemistPerMaand).toBeLessThanOrEqual(Math.round(200 * WEKEN_PER_MAAND));
  });

  it('verzint geen puntgetal uit array-invoer (comma-join misgelezen als decimaal)', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: ['5', '6'], gemiddelde_klantwaarde: '400' });
    expect(r.modus).not.toBe('punt');
  });

  it('verzint geen puntgetal uit object-invoer', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: { foo: 'bar' }, gemiddelde_klantwaarde: '400' });
    expect(r.modus).not.toBe('punt');
  });

  it('verzint geen puntgetal uit boolean-invoer', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: true, gemiddelde_klantwaarde: '400' });
    expect(r.modus).not.toBe('punt');
  });

  it('claimt geen verlies wanneer gemistPerMaand na afronding 0 is', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: '0.001', gemiddelde_klantwaarde: '400' });
    expect(r.modus).toBe('geen');
    expect(r.gemistPerMaand).toBe(null);
    expect(r.verliesPerMaandCent).toBe(null);
    expect(r.verliesLaagCent).toBe(null);
    expect(r.verliesHoogCent).toBe(null);
  });
});
