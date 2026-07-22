// Legt vast dat de self-serve wizard-antwoorden vertaald worden naar de
// geneste vorm die buildConfig() in elevenlabs.js verwacht (i.bedrijf,
// i.kennis, ...). Zonder deze vertaling schreef mintKlantEnOrder de platte
// wizard-antwoorden direct als intake_json weg — buildConfig las overal lege
// objecten en provisionAgent maakte een agent die zei "u spreekt met Emma van
// het bedrijf, openingstijden onbekend" terwijl de ElevenLabs-call gewoon
// slaagde. Zie docs/superpowers/specs/2026-07-22-selfserve-funnel-design.md §5.
import { describe, it, expect } from 'vitest';
import { buildProvisioningIntake } from '../src/lib/funnel-intake.js';

describe('buildProvisioningIntake', () => {
  it('mapt de bedrijfsnaam van de klant naar bedrijf.bedrijfsnaam voor emma-telefoon', () => {
    const out = buildProvisioningIntake('emma-telefoon', {
      company: 'Slagerij Jansen',
      answers: { huidige_lijn: '+31612345678', call_volume: '10-30' },
    });
    expect(out.bedrijf).toEqual({ bedrijfsnaam: 'Slagerij Jansen' });
  });

  it('mapt de gewenste openingstoon naar kennis.toon', () => {
    const out = buildProvisioningIntake('emma-telefoon', {
      company: 'Slagerij Jansen',
      answers: { openingstoon: 'Zakelijk en warm' },
    });
    expect(out.kennis).toEqual({ toon: 'Zakelijk en warm' });
  });

  it('verzint niets: een niet-opgegeven veld ontbreekt volledig in de output (geen lege string, geen placeholder)', () => {
    const out = buildProvisioningIntake('emma-telefoon', { company: '', answers: {} });
    expect(out.bedrijf).toBeUndefined();
    expect(out.kennis).toBeUndefined();
  });

  it('geeft een leeg object voor een product_key zonder mapping (geen crash, geen verzonnen data)', () => {
    expect(buildProvisioningIntake('onbekend-product', { company: 'X', answers: {} })).toEqual({});
  });

  it('is bestand tegen ontbrekende klant/answers', () => {
    expect(buildProvisioningIntake('emma-telefoon', undefined)).toEqual({});
    expect(buildProvisioningIntake('emma-telefoon', {})).toEqual({});
  });
});
