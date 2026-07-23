import { describe, it, expect, afterEach } from 'vitest';
import * as registry from '../src/lib/provisioners/index.js';
import * as voice from '../src/lib/provisioners/voice.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('provisioner-registry', () => {
  it('resolve mapt emma-telefoon en emma naar de voice-provisioner', () => {
    expect(registry.resolve('emma-telefoon')).toBe(voice);
    expect(registry.resolve('emma')).toBe(voice);
  });
  it('resolve geeft null voor een onbekend/handmatig product', () => {
    expect(registry.resolve('agenda-assistant')).toBe(null);
    expect(registry.canProvision('agenda-assistant')).toBe(false);
    expect(registry.canProvision('emma-telefoon')).toBe(true);
  });
});

describe('voice.missingForLive', () => {
  // Geneste intake-structuur — exact zoals de intake-wizard opslaat
  // (answers[step.key] = vals) en buildConfig() leest (i.bedrijf.bedrijfsnaam, ...).
  const compleet = {
    _productKey: 'emma-telefoon',
    bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
    bereikbaarheid: { huidig_nummer: '+31 6 1', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
    afhandeling: { taken: ['Afspraken inplannen'] },
    kennis: { toon: 'Zakelijk en warm' },
    integraties: { agenda: 'Geen / weet ik nog niet' },
  };

  it('geeft [] wanneer alle verplichte velden ingevuld zijn en geen agenda gekozen', () => {
    expect(voice.missingForLive(compleet)).toEqual([]);
  });

  it('noemt een ontbrekend genest verplicht veld', () => {
    const intake = { ...compleet, bereikbaarheid: { ...compleet.bereikbaarheid, openingstijden: '' } };
    expect(voice.missingForLive(intake)).toContain('openingstijden');
  });

  it('noemt ontbrekende verplichte velden uit meerdere stappen', () => {
    const intake = {
      ...compleet,
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: '' },
      afhandeling: { taken: [] },
    };
    const missing = voice.missingForLive(intake);
    expect(missing).toContain('branche');
    expect(missing).toContain('taken');
  });

  it('eist agenda_koppeling alleen als Google Agenda is gekozen én geen token', () => {
    const metGoogleAgenda = { ...compleet, integraties: { agenda: 'Google Agenda' }, agendaGekoppeld: false };
    const metGoogleAgendaGekoppeld = { ...compleet, integraties: { agenda: 'Google Agenda' }, agendaGekoppeld: true };
    expect(voice.missingForLive(metGoogleAgenda)).toContain('agenda_koppeling');
    expect(voice.missingForLive(metGoogleAgendaGekoppeld)).not.toContain('agenda_koppeling');
    expect(voice.missingForLive(compleet)).not.toContain('agenda_koppeling');
  });
});

describe('voice.provision', () => {
  it('geeft wacht_op_klant zonder externe call als er velden ontbreken', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return { ok: true, status: 200, text: async () => '{}' }; };
    const intake = {
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
      bereikbaarheid: { huidig_nummer: '+31 6 1', openingstijden: '', buiten_tijden: 'Voicemail buiten openingstijden' },
      afhandeling: { taken: ['Afspraken inplannen'] },
      kennis: { toon: 'Zakelijk en warm' },
      integraties: { agenda: 'Geen / weet ik nog niet' },
    };
    const r = await voice.provision({ ELEVENLABS_API_KEY: 'k' }, { service: { id: 's1' }, order: { product_key: 'emma-telefoon' }, intake, customerId: 'c1' });
    expect(r.status).toBe('wacht_op_klant');
    expect(r.wachtOp).toContain('openingstijden');
    expect(called).toBe(false);
  });

  it('bouwt de agent en geeft klaar als niets ontbreekt', async () => {
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/convai/knowledge-base')) return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'kb_1' }) };
      if (u.includes('/convai/agents/create')) return { ok: true, status: 200, text: async () => JSON.stringify({ agent_id: 'ag_1' }) };
      throw new Error(`onverwacht: ${u}`);
    };
    const intake = {
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
      bereikbaarheid: { huidig_nummer: '+31 6 1', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
      afhandeling: { taken: ['Afspraken inplannen'] },
      kennis: { toon: 'Zakelijk en warm' },
      integraties: { agenda: 'Geen / weet ik nog niet' },
    };
    const r = await voice.provision({ ELEVENLABS_API_KEY: 'k' }, { service: { id: 's1' }, order: { product_key: 'emma-telefoon' }, intake, customerId: 'c1' });
    expect(r.status).toBe('klaar');
    expect(r.provisioning?.agent_id).toBe('ag_1');
  });
});
