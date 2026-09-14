// EU AI Act art. 50 (van kracht sinds 2 augustus 2026): wie met Emma spreekt of
// chat, moet meteen horen/lezen dat het een AI is. Deze test vergrendelt dat in
// de agent-configuratie die bij provisioning naar ElevenLabs gaat.
import { describe, it, expect } from 'vitest';
import { buildConfig, AI_DISCLOSURE_RULE } from '../src/lib/elevenlabs.js';

const intake = {
  bedrijf: { bedrijfsnaam: 'Praktijk De Linde', branche: 'fysiotherapie' },
  bereikbaarheid: { openingstijden: 'ma-vr 08:00-18:00' },
  afhandeling: { taken: ['afspraken inplannen'] },
  kennis: { talen: ['Nederlands'] },
};

describe('Emma — AI-transparantie (AI Act art. 50)', () => {
  for (const productKey of ['emma-telefoon', 'emma']) {
    it(`${productKey}: openingszin noemt dat Emma een AI-assistent is`, () => {
      const cfg = buildConfig(productKey, intake);
      expect(cfg.firstMessage).toMatch(/AI-assistent/);
      expect(cfg.firstMessage).toContain('Praktijk De Linde');
    });

    it(`${productKey}: systeemprompt verbiedt zich als mens voordoen`, () => {
      const cfg = buildConfig(productKey, intake);
      expect(cfg.systemPrompt).toContain(AI_DISCLOSURE_RULE);
      expect(cfg.systemPrompt).toMatch(/nooit voor als mens/);
    });
  }

  it('ook zonder bedrijfsnaam blijft de AI-vermelding staan', () => {
    const cfg = buildConfig('emma-telefoon', {});
    expect(cfg.firstMessage).toMatch(/AI-assistent/);
  });
});
