// Owner-eis 2026-10-11: op ELKE publieke pagina staan bovenaan drie manieren om
// contact op te nemen — snel formulier, WhatsApp en e-mail. Dit bestand
// vergrendelt die regel zodat een "opschoning" van de header hem niet stilletjes
// terugdraait, en test het phone-only pad van /api/submit end-to-end (met
// gemockte D1/Brevo: er gaat geen echte lead naar productie).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import worker from '../src/worker.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const header = read('src/components/Header.astro');
const layout = read('src/layouts/BaseLayout.astro');

describe('Contact-trio bovenaan elke publieke pagina', () => {
  it('BaseLayout rendert de Header op elke pagina; admin/portal-layouts niet', () => {
    expect(layout).toMatch(/<Header \/>/);
    expect(read('src/layouts/AdminLayout.astro')).not.toMatch(/components\/Header/);
    expect(read('src/layouts/PortalLayout.astro')).not.toMatch(/components\/Header/);
  });

  it('WhatsApp-icoon in de header via de /whatsapp-route (vooringevuld NL-bericht)', () => {
    expect(header).toMatch(/<a href="\/whatsapp"[^>]*id="header-whatsapp"/);
    // Ongemoeid: de route zelf zet de standaardtekst "Hallo! Ik kom via aanloopai.nl…"
    expect(read('src/worker.js')).toContain("'Hallo! Ik kom via aanloopai.nl en heb een vraag.'");
  });

  it('e-mailicoon in de header: mailto naar hello@aanloopai.nl, zichtbaar op mobiel', () => {
    expect(header).toContain("const CONTACT_MAIL = 'hello@aanloopai.nl'");
    expect(header).toMatch(/<a href=\{mailHref\} id="header-mail" class="inline-flex/);
    expect(header).toContain('mailto:${CONTACT_MAIL}');
    expect(read('src/worker.js')).toContain("const NOTIFICATION_EMAIL = 'hello@aanloopai.nl'");
  });

  it('formulier-knop zit in de header en het formulier hergebruikt /api/submit met honeypot', () => {
    expect(header).toMatch(/id="qc-toggle"[^>]*aria-controls="quick-contact"/);
    expect(header).toContain('name="form_type" value="snel"');
    expect(header).toContain('name="botcheck"');
    expect(header).toContain("fetch('/api/submit'");
  });

  it('geen tweede formulier op pagina\'s waar het formulier de pagina zelf is', () => {
    expect(header).toContain("new Set(['/contact/', '/demo-aanvragen/', '/aanvragen/'])");
  });

  it('WhatsApp en e-mail zijn op mobiel zichtbaar zonder menu (geen hidden-klasse)', () => {
    for (const id of ['header-whatsapp', 'header-mail']) {
      const tag = header.match(new RegExp(`id="${id}" class="([^"]*)"`));
      expect(tag, id).not.toBeNull();
      expect(tag[1]).not.toMatch(/(^|\s)hidden(\s|$)/);
    }
    expect(header).not.toMatch(/id="qc-toggle" class="[^"]*(^|\s)hidden(\s|$)/);
  });
});

function makeEnv() {
  const inserts = [];
  const env = {
    BREVO_API_KEY: 'test-key',
    PORTAL_DB: {
      prepare(sql) {
        return {
          bind: (...args) => ({ run: async () => { if (/INSERT INTO inbound_leads/.test(sql)) inserts.push(args); return {}; } }),
        };
      },
    },
  };
  return { env, inserts };
}

function post(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new Request('https://aanloopai.nl/api/submit', { method: 'POST', body: fd });
}

describe('/api/submit — form_type=snel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('telefoon zonder e-mail: lead opgeslagen (email leeg), alleen notificatiemail, geen autoresponder', async () => {
    const sent = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      if (String(url).includes('api.brevo.com/v3/smtp/email')) sent.push(JSON.parse(init.body));
      return new Response('{}', { status: 201 });
    }));
    const { env, inserts } = makeEnv();
    const res = await worker.fetch(post({ form_type: 'snel', naam: 'Test Persoon', telefoon: '06 12345678', interesse: 'Website' }), env, { waitUntil() {} });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(inserts).toHaveLength(1);
    expect(inserts[0][3]).toBe(''); // email-kolom is NOT NULL
    expect(sent).toHaveLength(1);
    expect(sent[0].to[0].email).toBe('hello@aanloopai.nl');
    expect(sent[0].replyTo).toBeUndefined();
  });

  it('e-mail zonder telefoon: notificatie + bevestiging aan bezoeker', async () => {
    const sent = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      if (String(url).includes('api.brevo.com/v3/smtp/email')) sent.push(JSON.parse(init.body));
      return new Response('{}', { status: 201 });
    }));
    const { env } = makeEnv();
    const res = await worker.fetch(post({ form_type: 'snel', naam: 'Test', email: 'test@example.nl' }), env, { waitUntil() {} });
    expect(res.status).toBe(200);
    expect(sent.map((m) => m.to[0].email)).toEqual(['hello@aanloopai.nl', 'test@example.nl']);
  });

  it('geen telefoon én geen e-mail, of geen naam: 400 en niets opgeslagen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 201 })));
    for (const fields of [
      { form_type: 'snel', naam: 'Test' },
      { form_type: 'snel', naam: 'Test', telefoon: '12' },
      { form_type: 'snel', naam: 'Test', email: 'geen-mail' },
      { form_type: 'snel', telefoon: '0612345678' },
    ]) {
      const { env, inserts } = makeEnv();
      const res = await worker.fetch(post(fields), env, { waitUntil() {} });
      expect(res.status, JSON.stringify(fields)).toBe(400);
      expect(inserts).toHaveLength(0);
    }
  });

  it('andere formulieren blijven een geldig e-mailadres eisen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 201 })));
    const { env } = makeEnv();
    const res = await worker.fetch(post({ form_type: 'demo', voornaam: 'X', telefoon: '0612345678' }), env, { waitUntil() {} });
    expect(res.status).toBe(400);
  });

  it('honeypot gevuld: success zonder opslag', async () => {
    const { env, inserts } = makeEnv();
    const res = await worker.fetch(post({ form_type: 'snel', naam: 'Bot', telefoon: '0612345678', botcheck: 'x' }), env, { waitUntil() {} });
    expect((await res.json()).success).toBe(true);
    expect(inserts).toHaveLength(0);
  });
});
