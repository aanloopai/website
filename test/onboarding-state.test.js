import { describe, it, expect } from 'vitest';
import { onboardingState } from '../src/lib/onboarding.js';

// Geneste intake-structuur — exact zoals de intake-wizard opslaat
// (answers[step.key] = vals): intake[step.key][field.name].
const compleetIntake = {
  bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
  bereikbaarheid: { huidig_nummer: '+31 6 1', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
  afhandeling: { taken: ['Afspraken inplannen'] },
  kennis: { toon: 'Zakelijk en warm' },
  integraties: { agenda: 'Geen / weet ik nog niet' },
};

function order(intake, productKey = 'emma-telefoon') {
  return { product_key: productKey, intake_json: JSON.stringify(intake) };
}

describe('onboardingState', () => {
  it('berekent voortgang uit gedeeltelijk ingevulde geneste intake', () => {
    const intake = { ...compleetIntake, bedrijf: { ...compleetIntake.bedrijf, branche: '' } };
    const st = onboardingState(order(intake), false);
    expect(st.klaar).toBe(false);
    expect(st.missing).toContain('branche');
    expect(st.progressPct).toBeGreaterThan(0);
    expect(st.progressPct).toBeLessThan(100);
  });

  it('klaar=true en 100% wanneer niets ontbreekt', () => {
    const st = onboardingState(order(compleetIntake), false);
    expect(st).toMatchObject({ productKey: 'emma-telefoon', missing: [], klaar: true, progressPct: 100 });
  });

  it('agenda=Google Agenda zonder koppeling: agenda_koppeling telt mee in missing én noemer', () => {
    const intake = { ...compleetIntake, integraties: { agenda: 'Google Agenda' } };
    const st = onboardingState(order(intake), false);
    expect(st.missing).toContain('agenda_koppeling');
    expect(st.klaar).toBe(false);
    // Zelfde ingevulde velden, maar noemer is +1 (agenda_koppeling) dus lager dan 100%.
    expect(st.progressPct).toBeLessThan(100);
  });

  it('agenda=Google Agenda mét koppeling: agenda_koppeling niet in missing, 100%', () => {
    const intake = { ...compleetIntake, integraties: { agenda: 'Google Agenda' } };
    const st = onboardingState(order(intake), true);
    expect(st.missing).not.toContain('agenda_koppeling');
    expect(st.klaar).toBe(true);
    expect(st.progressPct).toBe(100);
  });

  it('niet-provisionable product krijgt veilige lege state (klaar, geen missing)', () => {
    const st = onboardingState(order({}, 'agenda-assistant'), false);
    expect(st).toEqual({ productKey: 'agenda-assistant', missing: [], progressPct: 100, klaar: true });
  });

  it('kapotte intake_json crasht niet — valt terug op lege intake', () => {
    const st = onboardingState({ product_key: 'emma-telefoon', intake_json: '{ dit is geen json' }, false);
    expect(st.klaar).toBe(false);
    expect(st.missing.length).toBeGreaterThan(0);
    expect(st.progressPct).toBe(0);
  });
});
