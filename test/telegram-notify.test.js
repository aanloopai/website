// Owner-besluit 2026-09-10: ELKE inbound gebeurtenis op aanloopai.nl landt op
// Telegram — formulieren (/api/submit, alle form_types), intake-wizard
// (/api/intake), ontvangen betalingen (Mollie onPaid) en ingeplande demo's
// (calendar). Deze test bewaakt (a) de notify-helper zelf en (b) dat de vier
// codepaden de helper daadwerkelijk aanroepen — een refactor die er één laat
// vallen, faalt hier.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { notifyTelegram, formatSubmitTelegram, alertStaff } from '../src/lib/notify.js';

const ROOT = join(import.meta.dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('notifyTelegram', () => {
  const origFetch = globalThis.fetch;
  let calls;
  beforeEach(() => {
    calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: true, status: 200 };
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it('stuurt sendMessage naar de geconfigureerde chat', async () => {
    const env = { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '42' };
    const ok = await notifyTelegram(env, 'hallo');
    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.telegram.org/bottok/sendMessage');
    expect(calls[0].body).toMatchObject({ chat_id: '42', text: 'hallo' });
  });

  it('is een no-op zonder secrets en gooit nooit', async () => {
    expect(await notifyTelegram({}, 'x')).toBe(false);
    expect(calls).toHaveLength(0);
    globalThis.fetch = vi.fn(async () => { throw new Error('netwerk'); });
    expect(await notifyTelegram({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }, 'x')).toBe(false);
  });

  it('kapt lange teksten af onder de Telegram-limiet', async () => {
    await notifyTelegram({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }, 'a'.repeat(10000));
    expect(calls[0].body.text.length).toBeLessThanOrEqual(4096);
  });

  it('alertStaff blijft ook Telegram gebruiken (storingen)', async () => {
    await alertStaff({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }, 'Onderwerp', 'Body');
    expect(calls.some((c) => c.body.text.startsWith('⚠️ Onderwerp'))).toBe(true);
  });
});

describe('formatSubmitTelegram', () => {
  it('bevat form_type, afzender, bekende velden en admin-link; kapt vrije tekst af', () => {
    const text = formatSubmitTelegram({
      formType: 'leads',
      fields: { bedrijf: 'Keukenzaak BV', telefoon: '0612345678', sector: 'keukens', regio: 'Rotterdam', bericht: 'x'.repeat(500), botcheck: '' },
      userEmail: 'a@b.nl', fullName: 'Jan Jansen', leadId: 'lead_1',
    });
    expect(text).toContain('Nieuwe leads via aanloopai.nl');
    expect(text).toContain('Jan Jansen <a@b.nl>');
    expect(text).toContain('Bedrijf: Keukenzaak BV');
    expect(text).toContain('Branche: keukens');
    expect(text).toContain('Regio: Rotterdam');
    expect(text).toContain('admin/aanvragen (lead lead_1)');
    expect(text).not.toContain('x'.repeat(301));
  });
});

describe('bedrading: elk inbound pad roept notifyTelegram aan', () => {
  it('/api/submit — voor élk form_type, direct na opslag in D1', () => {
    const worker = read('src/worker.js');
    const i = worker.indexOf('const leadId = await storeInboundLead(');
    const j = worker.indexOf('if (!env.BREVO_API_KEY)', i);
    expect(i).toBeGreaterThan(0);
    expect(worker.slice(i, j)).toContain('notifyTelegram(env, formatSubmitTelegram(');
  });
  it('/api/intake — na de D1-insert', () => {
    const worker = read('src/worker.js');
    const i = worker.indexOf('INSERT INTO intake_requests');
    const j = worker.indexOf('if (env.INTAKE_WEBHOOK_URL && env.INTAKE_WEBHOOK_SECRET)', i);
    expect(worker.slice(i, j)).toContain('notifyTelegram(env,');
  });
  it('Mollie onPaid en calendar-boeking', () => {
    const mollie = read('src/lib/mollie.js');
    const i = mollie.indexOf('async function onPaid(');
    expect(mollie.slice(i, i + 1500)).toContain('notifyTelegram(env,');
    const cal = read('src/lib/calendar-routes.js');
    const k = cal.indexOf('const event = await r.json();');
    expect(cal.slice(k, k + 1200)).toContain('notifyTelegram(env,');
  });
  it('deploy.yml zet TELEGRAM_BOT_TOKEN en TELEGRAM_CHAT_ID als Worker-secrets', () => {
    const yml = read('.github/workflows/deploy.yml');
    // Versions-modus Worker: alleen `versions secret bulk` werkt (API 10215).
    expect(yml).toContain('versions secret bulk');
    expect(yml).toContain('TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}');
    expect(yml).toContain('TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}');
  });
});
