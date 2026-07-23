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
    bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
    bereikbaarheid: { huidig_nummer: '+31 6 1', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
    afhandeling: { taken: ['Afspraken inplannen'] },
    kennis: { toon: 'Zakelijk en warm' },
    integraties: { agenda: 'Geen / weet ik nog niet' },
  };

  it('geeft [] wanneer alle verplichte velden ingevuld zijn en geen agenda gekozen', () => {
    expect(voice.missingForLive(compleet, 'emma-telefoon')).toEqual([]);
  });

  it('noemt een ontbrekend genest verplicht veld', () => {
    const intake = { ...compleet, bereikbaarheid: { ...compleet.bereikbaarheid, openingstijden: '' } };
    expect(voice.missingForLive(intake, 'emma-telefoon')).toContain('openingstijden');
  });

  it('noemt ontbrekende verplichte velden uit meerdere stappen', () => {
    const intake = {
      ...compleet,
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: '' },
      afhandeling: { taken: [] },
    };
    const missing = voice.missingForLive(intake, 'emma-telefoon');
    expect(missing).toContain('branche');
    expect(missing).toContain('taken');
  });

  it('eist agenda_koppeling alleen als Google Agenda is gekozen én geen token', () => {
    const metGoogleAgenda = { ...compleet, integraties: { agenda: 'Google Agenda' }, agendaGekoppeld: false };
    const metGoogleAgendaGekoppeld = { ...compleet, integraties: { agenda: 'Google Agenda' }, agendaGekoppeld: true };
    expect(voice.missingForLive(metGoogleAgenda, 'emma-telefoon')).toContain('agenda_koppeling');
    expect(voice.missingForLive(metGoogleAgendaGekoppeld, 'emma-telefoon')).not.toContain('agenda_koppeling');
    expect(voice.missingForLive(compleet, 'emma-telefoon')).not.toContain('agenda_koppeling');
  });

  it('kiest het emma-schema op basis van de productKey-parameter, niet intake._productKey', () => {
    // Complete emma-telefoon-intake — heeft geen kennis.faq / afhandeling.handover / kennis.talen.
    const intakeMetVerkeerdeHint = { ...compleet, _productKey: 'emma-telefoon' };
    const missingAlsEmma = voice.missingForLive(intakeMetVerkeerdeHint, 'emma');
    const missingAlsEmmaTelefoon = voice.missingForLive(intakeMetVerkeerdeHint, 'emma-telefoon');
    // Ondanks _productKey: 'emma-telefoon' op de intake, stuurt de expliciete
    // parameter 'emma' het emma-schema aan (en dus andere missende velden).
    expect(missingAlsEmma).not.toEqual(missingAlsEmmaTelefoon);
    expect(missingAlsEmma).toContain('faq');
    expect(missingAlsEmma).toContain('talen');
    expect(missingAlsEmma).toContain('handover');
    expect(missingAlsEmmaTelefoon).toEqual([]);
  });

  it('geeft [] voor een complete emma-intake (eigen schema: kennis.faq, afhandeling.handover, kennis.talen)', () => {
    const emmaCompleet = {
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
      kanaal: {},
      kennis: { faq: [{ vraag: 'Wat kost het?', antwoord: 'Vanaf €497' }], talen: ['Nederlands'] },
      afhandeling: { handover: 'Emma handelt alles zelf af' },
    };
    expect(voice.missingForLive(emmaCompleet, 'emma')).toEqual([]);
  });

  it('noemt een leeg verplicht emma-veld (kennis.faq)', () => {
    const emmaIntake = {
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
      kanaal: {},
      kennis: { faq: [], talen: ['Nederlands'] },
      afhandeling: { handover: 'Emma handelt alles zelf af' },
    };
    expect(voice.missingForLive(emmaIntake, 'emma')).toContain('faq');
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

  it('geeft status fout (geen throw) als de ElevenLabs-call faalt op een complete intake', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'Internal Server Error' });
    const intake = {
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
      bereikbaarheid: { huidig_nummer: '+31 6 1', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
      afhandeling: { taken: ['Afspraken inplannen'] },
      kennis: { toon: 'Zakelijk en warm' },
      integraties: { agenda: 'Geen / weet ik nog niet' },
    };
    const r = await voice.provision({ ELEVENLABS_API_KEY: 'k' }, { service: { id: 's1' }, order: { product_key: 'emma-telefoon' }, intake, customerId: 'c1' });
    expect(r.status).toBe('fout');
    expect(r.error).toBeTruthy();
  });
});
