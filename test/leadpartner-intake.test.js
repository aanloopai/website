// Leadpartner-intake (2026-09-16): nieuw verborgen portaalproduct `leadpartner`
// met 10-staps schema, twee nieuwe veldtypes (`consent`, `info`), `showIf`,
// `?next=` na magic-link login (open-redirect-guard), admin-uitnodiging
// (POST /api/admin/intake-invite) en Telegram-melding bij indienen.
// Bron van de eisen: Desktop/aanloopai-portal-leadpartner-intake.md.
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { INTAKE_SCHEMAS, getIntakeSchema } from '../src/data/intake-schemas.ts';
import { PORTAL_CATALOG, getCatalogProduct, getCatalogTier } from '../src/data/portal-catalog.ts';
import {
  safeLabelHtml, fieldHtml, missingRequiredFields, isFieldVisible,
} from '../src/lib/portal-intake-fields.js';
import { safeNextPath, createSession, SESSION_COOKIE } from '../src/lib/auth.js';
import {
  handleAuthRequest, handleAuthVerify, handlePortalApi, formatOrderSubmitTelegram,
} from '../src/lib/portal-routes.js';
import { handleAdminApi } from '../src/lib/admin-routes.js';

const SITE_ORIGIN = 'https://aanloopai.nl';
const SECRET = 'test-session-secret';
const KNOWN_TYPES = ['text', 'textarea', 'tel', 'email', 'url', 'select', 'multiselect', 'faqlist', 'consent', 'info'];

// ── 1. schema + catalogus ───────────────────────────────────────────────────
describe('leadpartner schema', () => {
  const schema = INTAKE_SCHEMAS.leadpartner;

  it('bestaat, is de bron voor getIntakeSchema en heeft precies 10 stappen', () => {
    expect(schema).toBeTruthy();
    expect(getIntakeSchema('leadpartner')).toBe(schema);
    expect(schema.steps.map((s) => s.key)).toEqual([
      'bedrijf', 'registratie', 'dienstverlening', 'opdrachtgever', 'werkgebied',
      'leadkwaliteit', 'levering', 'volume', 'huidig', 'afronding',
    ]);
  });

  it('gebruikt alleen bekende veldtypes, unieke namen per stap, en label of info-tekst', () => {
    for (const step of schema.steps) {
      const names = step.fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
      for (const f of step.fields) {
        expect(KNOWN_TYPES).toContain(f.type);
        if (f.type === 'info') expect(f.text).toBeTruthy();
        else expect(f.label).toBeTruthy();
        if (f.type === 'select' || f.type === 'multiselect') expect(f.options?.length).toBeGreaterThan(1);
      }
    }
  });

  it('showIf verwijst altijd naar een select/multiselect in dezelfde stap met bestaande opties', () => {
    let count = 0;
    for (const step of schema.steps) {
      for (const f of step.fields) {
        if (!f.showIf) continue;
        count++;
        const src = step.fields.find((g) => g.name === f.showIf.field);
        expect(src, `${step.key}.${f.name} → ${f.showIf.field}`).toBeTruthy();
        expect(['select', 'multiselect']).toContain(src.type);
        for (const v of f.showIf.in) expect(src.options).toContain(v);
        expect(f.required).toBeFalsy(); // verborgen velden zijn nooit verplicht
      }
    }
    expect(count).toBe(4);
  });

  it('eindigt met twee verplichte consent-velden; de voorwaarden-link is relatief', () => {
    const last = schema.steps[schema.steps.length - 1];
    const consents = last.fields.filter((f) => f.type === 'consent');
    expect(consents.map((f) => f.name)).toEqual(['akkoord_voorwaarden', 'akkoord_overeenkomst']);
    for (const c of consents) expect(c.required).toBe(true);
    expect(consents[0].labelHtml).toContain('href="/leads-kopen/voorwaarden/"');
  });

  it('bevat nergens een bedrag als prijsbelofte (prijs per lead = in gesprek)', () => {
    const text = JSON.stringify(schema);
    // Het budget-veld vraagt de partner naar zíjn verwachting; dat is geen belofte.
    // Alles daarbuiten mag geen euro-bedrag bevatten.
    const budgetField = schema.steps.find((s) => s.key === 'volume').fields.find((f) => f.name === 'budget_lead');
    const without = text.replace(JSON.stringify(budgetField), '');
    expect(without).not.toMatch(/€\s?\d/);
  });

  it('de 8 bestaande producten renderen ongewijzigd (geen nieuw veldtype in oude schema\'s)', () => {
    for (const p of PORTAL_CATALOG.filter((x) => !x.verborgen)) {
      const s = getIntakeSchema(p.key);
      for (const step of s.steps) for (const f of step.fields) {
        expect(['consent', 'info']).not.toContain(f.type);
        expect(f.showIf).toBeUndefined();
      }
    }
  });
});

describe('leadpartner in de catalogus', () => {
  it('is verborgen, heeft één tier "Exclusief" op aanvraag zonder bedrag', () => {
    const p = getCatalogProduct('leadpartner');
    expect(p.verborgen).toBe(true);
    expect(p.naam).toBe('Leads kopen — partnerintake');
    expect(p.tiers.map((t) => t.naam)).toEqual(['Exclusief']);
    const t = getCatalogTier('leadpartner', 'Exclusief');
    expect(t.betaling).toBe('aanvraag');
    expect(t.prijsCent).toBeNull();
    expect(t.setupCent).toBe(0);
  });

  it('alleen de leadpartner-intakes zijn verborgen — de 8 bestaande blijven zichtbaar', () => {
    expect(PORTAL_CATALOG.filter((p) => p.verborgen).map((p) => p.key)).toEqual(['leadpartner', 'leadpartner-schoonmaak']);
    expect(PORTAL_CATALOG.filter((p) => !p.verborgen)).toHaveLength(8);
  });
});

// ── 2. renderer: consent / info / showIf ────────────────────────────────────
describe('portal-intake-fields: consent, info, showIf', () => {
  it('safeLabelHtml laat alleen een relatieve <a> door en escapet al het andere', () => {
    const ok = 'Akkoord met de <a href="/leads-kopen/voorwaarden/" target="_blank" rel="noopener" class="p-link">leadvoorwaarden</a>';
    expect(safeLabelHtml(ok)).toBe(ok);
    const bad = '<a href="https://evil.example">x</a><script>1</script><a href="/ok" onclick="x()">y</a><img src=x onerror=1>';
    const out = safeLabelHtml(bad);
    expect(out).not.toMatch(/<(script|img|a )/);
    expect(out).toContain('&lt;script&gt;');
  });

  it('info rendert een tekstblok zonder input; consent een checkbox met boolean-waarde', () => {
    const info = fieldHtml({ name: 'i', type: 'info', text: 'Wtta <b>' }, undefined);
    expect(info).not.toContain('<input');
    expect(info).toContain('Wtta &lt;b&gt;');
    const c = fieldHtml({ name: 'c', type: 'consent', label: 'Akkoord', required: true }, true);
    expect(c).toContain('type="checkbox"');
    expect(c).toContain('id="fld_c"');
    expect(c).toContain(' checked');
    expect(fieldHtml({ name: 'c', type: 'consent', label: 'Akkoord' }, false)).not.toContain(' checked');
  });

  it('bestaande veldtypes renderen exact als voorheen (regressie-anker)', () => {
    expect(fieldHtml({ name: 't', label: 'Naam', type: 'text', required: true }, 'x'))
      .toBe('<label class="plabel">Naam *</label><input type="text" class="pinput" id="fld_t" data-f="t" value="x" placeholder="" />');
  });

  const step = {
    fields: [
      { name: 'kanaal', label: 'Kanaal', type: 'multiselect', required: true, options: ['E-mail', 'CRM'] },
      { name: 'crm', label: 'CRM', type: 'text', required: true, showIf: { field: 'kanaal', in: ['CRM'] } },
      { name: 'ok', label: 'Akkoord', type: 'consent', required: true },
      { name: 'i', type: 'info', text: 'x', required: true },
    ],
  };

  it('missingRequiredFields: consent moet true zijn, info telt nooit, showIf-verborgen telt niet', () => {
    expect(missingRequiredFields(step, { kanaal: ['E-mail'], ok: false }).map((f) => f.name)).toEqual(['ok']);
    expect(missingRequiredFields(step, { kanaal: ['E-mail'], ok: 'ja' }).map((f) => f.name)).toEqual(['ok']);
    expect(missingRequiredFields(step, { kanaal: ['CRM'], ok: true }).map((f) => f.name)).toEqual(['crm']);
    expect(missingRequiredFields(step, { kanaal: ['CRM'], crm: 'Carerix', ok: true })).toEqual([]);
  });

  it('isFieldVisible werkt voor select (string) en multiselect (array)', () => {
    const f = { showIf: { field: 'x', in: ['a', 'b'] } };
    expect(isFieldVisible(f, { x: 'a' })).toBe(true);
    expect(isFieldVisible(f, { x: 'c' })).toBe(false);
    expect(isFieldVisible(f, { x: ['c', 'b'] })).toBe(true);
    expect(isFieldVisible(f, {})).toBe(false);
    expect(isFieldVisible({ name: 'geen' }, {})).toBe(true);
  });
});

// ── 3. ?next= open-redirect-guard ───────────────────────────────────────────
describe('safeNextPath', () => {
  it('accepteert alleen site-interne portaalpaden', () => {
    expect(safeNextPath('/portal/intake/?order=ord_abc')).toBe('/portal/intake/?order=ord_abc');
    expect(safeNextPath('/portal/')).toBe('/portal/');
  });
  it.each([
    'https://evil.example/portal/', '//evil.example/portal/', '/\\evil.example', '/portal/\\x',
    'javascript:alert(1)', '/portal/?u=http://x', '/admin/', '/leads-kopen/', '', null, undefined,
    '/portal/../admin/', '/portal/x\n', 'portal/intake', `/portal/${'a'.repeat(600)}`,
  ])('weigert %s', (v) => {
    expect(safeNextPath(v)).toBeNull();
  });
});

// ── 4. magic link: next in de maillink en in de redirect ────────────────────
function makeAuthDb({ users = [], links = [] }) {
  const state = { links: [...links], inserts: [] };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('FROM users WHERE email = ?')) return users.find((u) => u.email === args[0]) || null;
              if (sql.includes('FROM users WHERE id = ?')) return users.find((u) => u.id === args[0]) || null;
              if (sql.includes('FROM magic_links WHERE token_hash = ?')) return state.links.find((l) => l.token_hash === args[0]) || null;
              return null;
            },
            async run() {
              if (sql.startsWith('INSERT INTO magic_links')) state.inserts.push(args);
              if (sql.startsWith('UPDATE magic_links SET used = 1')) {
                const l = state.links.find((x) => x.token_hash === args[0] && !x.used);
                if (l) { l.used = 1; return { meta: { changes: 1 } }; }
                return { meta: { changes: 0 } };
              }
              return { meta: { changes: 1 } };
            },
            async all() { return { results: [] }; },
          };
        },
      };
    },
  };
}

describe('magic link met ?next=', () => {
  const origFetch = globalThis.fetch;
  let mails;
  beforeEach(() => {
    mails = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      mails.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: true, status: 200, text: async () => '' };
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  const user = { id: 'usr_1', email: 'test@example.com', naam: 'Test Persoon', role: 'eigenaar', customer_id: 'cust_1' };
  const env = () => ({ PORTAL_DB: makeAuthDb({ users: [user] }), BREVO_API_KEY: 'k', PORTAL_SESSION_SECRET: SECRET });

  async function requestLink(body) {
    const req = new Request(`${SITE_ORIGIN}/api/auth/request`, {
      method: 'POST', headers: { 'content-type': 'application/json', Origin: SITE_ORIGIN }, body: JSON.stringify(body),
    });
    return handleAuthRequest(req, env());
  }

  it('zet een geldige next in de verify-link van de mail', async () => {
    const res = await requestLink({ email: user.email, next: '/portal/intake/?order=ord_1' });
    expect(res.status).toBe(200);
    expect(mails).toHaveLength(1);
    const html = mails[0].body.htmlContent;
    expect(html).toMatch(/\/portal\/verify\?token=[0-9a-f]{64}&amp;next=%2Fportal%2Fintake%2F%3Forder%3Dord_1/);
  });

  it('negeert een externe next stilzwijgend (login blijft werken)', async () => {
    const res = await requestLink({ email: user.email, next: 'https://evil.example/' });
    expect(res.status).toBe(200);
    expect(mails[0].body.htmlContent).not.toContain('next=');
    expect(mails[0].body.htmlContent).not.toContain('evil.example');
  });

  async function verify(db, form) {
    const req = new Request(`${SITE_ORIGIN}/api/auth/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', Origin: SITE_ORIGIN },
      body: new URLSearchParams(form).toString(),
    });
    return handleAuthVerify(req, { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET });
  }
  // sha256 van 'tok' (hex) — de stub matcht op token_hash.
  const TOK = 'tok';
  const TOK_HASH = '2d4c5f6e1b6d0aa3dd77dab68e5f5b8a5ecc02f7d8bf6d1d1ba6d0f5ce1f8d3c';

  async function linkRow() {
    const { sha256Hex } = await import('../src/lib/auth.js');
    return { token_hash: await sha256Hex(TOK), user_id: user.id, expires_at: Date.now() + 60_000, used: 0 };
  }

  it('verify: geldige next → redirect naar de intake; externe next → /portal/', async () => {
    let db = makeAuthDb({ users: [user], links: [await linkRow()] });
    let res = await verify(db, { token: TOK, next: '/portal/intake/?order=ord_1' });
    expect(res.status).toBe(200);
    expect((await res.json()).redirect).toBe('/portal/intake/?order=ord_1');
    expect(res.headers.get('Set-Cookie')).toContain(SESSION_COOKIE);

    db = makeAuthDb({ users: [user], links: [await linkRow()] });
    res = await verify(db, { token: TOK, next: 'https://evil.example/' });
    expect((await res.json()).redirect).toBe('/portal/');
    void TOK_HASH;
  });

  it('verify: staff landt altijd op /admin/, ook met next', async () => {
    const staff = { ...user, id: 'usr_s', role: 'staff' };
    const row = { ...(await linkRow()), user_id: staff.id };
    const db = makeAuthDb({ users: [staff], links: [row] });
    const res = await verify(db, { token: TOK, next: '/portal/intake/?order=ord_1' });
    expect((await res.json()).redirect).toBe('/admin/');
  });
});

// ── 5. klant kan een verborgen product niet zelf starten ────────────────────
describe('POST /api/portal/orders met verborgen product', () => {
  it('weigert leadpartner met dezelfde melding als een onbekend product', async () => {
    const user = { id: 'usr_1', customer_id: 'cust_1', email: 'test@example.com', naam: 'T', role: 'eigenaar' };
    const inserts = [];
    const db = {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() { return sql.includes('FROM users WHERE id = ?') ? user : null; },
              async run() { if (sql.startsWith('INSERT INTO service_orders')) inserts.push(args); return { meta: { changes: 1 } }; },
              async all() { return { results: [] }; },
            };
          },
        };
      },
    };
    const token = await createSession(user.id, SECRET);
    const mk = (product_key) => new Request(`${SITE_ORIGIN}/api/portal/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Origin: SITE_ORIGIN, Cookie: `${SESSION_COOKIE}=${token}` },
      body: JSON.stringify({ product_key, tier: 'Exclusief' }),
    });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET };
    const hidden = await handlePortalApi(mk('leadpartner'), env);
    const unknown = await handlePortalApi(mk('bestaat-niet'), env);
    expect(hidden.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect((await hidden.json()).error).toBe((await unknown.json()).error);
    expect(inserts).toHaveLength(0);
    // zichtbaar product start wél
    const ok = await handlePortalApi(mk('automation'), env);
    expect(ok.status).toBe(200);
    expect(inserts).toHaveLength(1);
  });
});

// ── 6. admin-uitnodiging ────────────────────────────────────────────────────
describe('POST /api/admin/intake-invite', () => {
  const origFetch = globalThis.fetch;
  let mails;
  beforeEach(() => {
    mails = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      mails.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: true, status: 200, text: async () => '' };
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  const staff = { id: 'usr_s', customer_id: null, email: 'staff@example.com', naam: 'S', role: 'staff' };
  const owner = { id: 'usr_o', customer_id: 'cust_1', email: 'test@example.com', naam: 'Cy Eigenaar', role: 'eigenaar' };

  function makeDb({ existingConcept = null } = {}) {
    const state = { orders: existingConcept ? [existingConcept] : [] };
    return {
      state,
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                if (sql.includes('FROM users WHERE id = ?')) return [staff, owner].find((u) => u.id === args[0]) || null;
                if (sql.includes('FROM customers WHERE id = ?')) return args[0] === 'cust_1' ? { id: 'cust_1', bedrijf: 'Cy FlexService' } : null;
                if (sql.includes("FROM users WHERE customer_id = ? AND role = 'eigenaar'")) return args[0] === 'cust_1' ? owner : null;
                if (sql.includes("FROM service_orders WHERE customer_id = ? AND product_key = ? AND status = 'concept'")) {
                  return state.orders.find((o) => o.customer_id === args[0] && o.product_key === args[1] && o.status === 'concept') || null;
                }
                return null;
              },
              async run() {
                if (sql.startsWith('INSERT INTO service_orders')) {
                  state.orders.push({ id: args[0], customer_id: args[1], user_id: args[2], product_key: args[3], tier: args[4], intake_json: args[5], status: args[6] });
                }
                return { meta: { changes: 1 } };
              },
              async all() { return { results: [] }; },
            };
          },
        };
      },
    };
  }

  async function call(db, body, { asStaff = true } = {}) {
    const token = await createSession(asStaff ? staff.id : owner.id, SECRET);
    const req = new Request(`${SITE_ORIGIN}/api/admin/intake-invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Origin: SITE_ORIGIN, Cookie: `${SESSION_COOKIE}=${token}` },
      body: JSON.stringify(body),
    });
    return handleAdminApi(req, { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, BREVO_API_KEY: 'k' });
  }

  it('maakt een concept-order voor de eigenaar en mailt de deeplink (login?next=intake)', async () => {
    const db = makeDb();
    const res = await call(db, { customer_id: 'cust_1', product_key: 'leadpartner', tier: 'Exclusief' });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.created).toBe(true);
    expect(j.mailed).toBe(true);
    expect(db.state.orders).toHaveLength(1);
    const o = db.state.orders[0];
    expect(o).toMatchObject({ customer_id: 'cust_1', user_id: 'usr_o', product_key: 'leadpartner', tier: 'Exclusief', status: 'concept', intake_json: '{}' });
    expect(j.order_id).toBe(o.id);
    expect(j.link).toBe(`${SITE_ORIGIN}/portal/login/?next=${encodeURIComponent(`/portal/intake/?order=${o.id}`)}`);

    expect(mails).toHaveLength(1);
    expect(mails[0].body.to[0].email).toBe('test@example.com');
    expect(mails[0].body.subject).toBe('Uw intake voor leadpartnerschap staat klaar — Aanloop AI');
    expect(mails[0].body.htmlContent).toContain('automatisch als concept opgeslagen');
    expect(mails[0].body.htmlContent).toContain(j.link.replace(/&/g, '&amp;'));
    // geen inlogtoken in deze mail — de klant vraagt zijn eigen magic link aan
    expect(mails[0].body.htmlContent).not.toContain('verify?token=');
  });

  it('hergebruikt een bestaande concept-order in plaats van een tweede aan te maken', async () => {
    const db = makeDb({ existingConcept: { id: 'ord_bestaand', customer_id: 'cust_1', user_id: 'usr_o', product_key: 'leadpartner', tier: 'Exclusief', status: 'concept' } });
    const res = await call(db, { customer_id: 'cust_1', product_key: 'leadpartner', tier: 'Exclusief' });
    const j = await res.json();
    expect(j.created).toBe(false);
    expect(j.order_id).toBe('ord_bestaand');
    expect(db.state.orders).toHaveLength(1);
    expect(mails).toHaveLength(1);
  });

  it('send_mail:false → order wél, mail niet, melding zegt "geen mail" (niet "MISLUKT")', async () => {
    const db = makeDb();
    const res = await call(db, { customer_id: 'cust_1', product_key: 'leadpartner', tier: 'Exclusief', send_mail: false });
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.mailed).toBe(false);
    expect(db.state.orders).toHaveLength(1);
    expect(mails).toHaveLength(0);
    expect(j.message).toContain('geen mail verstuurd');
    expect(j.message).not.toContain('MISLUKT');
  });

  it('weigert: geen staff (403), onbekend product/tier (400), onbekende klant (404)', async () => {
    expect((await call(makeDb(), { customer_id: 'cust_1', product_key: 'leadpartner', tier: 'Exclusief' }, { asStaff: false })).status).toBe(403);
    expect((await call(makeDb(), { customer_id: 'cust_1', product_key: 'leadpartner', tier: 'Goud' })).status).toBe(400);
    expect((await call(makeDb(), { customer_id: 'cust_1', product_key: 'nope', tier: 'Exclusief' })).status).toBe(400);
    expect((await call(makeDb(), { customer_id: 'cust_x', product_key: 'leadpartner', tier: 'Exclusief' })).status).toBe(404);
    expect(mails).toHaveLength(0);
  });
});

// ── 7. Telegram-melding bij indienen ────────────────────────────────────────
describe('formatOrderSubmitTelegram', () => {
  const intake = {
    bedrijf: { bedrijfsnaam: 'Cy FlexService', contactpersoon: 'Jan — eigenaar' },
    opdrachtgever: { sectoren: ['Logistiek / distributiecentra', 'Transport & vervoer'] },
    werkgebied: { basis: 'Rotterdam', straal: 'Tot 50 km' },
    volume: { volume_maand: '5–10' },
    levering: { lead_email: 'leads@example.com', lead_telefoon: '0612345678' },
    afronding: { factuur_email: 'factuur@example.com', btw: 'NL000000000B01' },
  };

  it('leadpartner: bedrijf, product, order, admin-link + samenvatting; nooit contactgegevens', () => {
    const text = formatOrderSubmitTelegram({ bedrijf: 'Cy FlexService', productKey: 'leadpartner', tier: 'Exclusief', orderId: 'ord_1', intake });
    expect(text).toContain('Bedrijf: Cy FlexService');
    expect(text).toContain('Product: leadpartner · Exclusief');
    expect(text).toContain('Order: ord_1');
    expect(text).toContain('Branche: Logistiek / distributiecentra, Transport & vervoer');
    expect(text).toContain('Werkgebied: Rotterdam · Tot 50 km');
    expect(text).toContain('Volume: 5–10/maand');
    expect(text).toContain(`${SITE_ORIGIN}/admin/aanvragen?order=ord_1`);
    expect(text).not.toMatch(/@example\.com|0612345678|NL000000000B01|Jan — eigenaar/);
  });

  it('ander product: alleen de kopregels, geen intake-details', () => {
    const text = formatOrderSubmitTelegram({ bedrijf: 'X', productKey: 'website', tier: 'Groei', orderId: 'ord_2', intake });
    expect(text.split('\n')).toHaveLength(5);
    expect(text).not.toContain('Branche:');
  });
});

describe('submitOrder stuurt Telegram (leadpartner)', () => {
  const origFetch = globalThis.fetch;
  let calls;
  beforeEach(() => {
    calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: true, status: 200, text: async () => '' };
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it('na het indienen landen mail (Brevo) én Telegram met de samenvatting', async () => {
    const user = { id: 'usr_o', customer_id: 'cust_1', email: 'test@example.com', naam: 'Cy Eigenaar', role: 'eigenaar' };
    const order = { id: 'ord_1', product_key: 'leadpartner', tier: 'Exclusief', status: 'concept' };
    const db = {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                if (sql.includes('FROM users WHERE id = ?')) return user;
                if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) return args[0] === 'ord_1' ? order : null;
                if (sql.includes('SELECT bedrijf FROM customers WHERE id = ?')) return { bedrijf: 'Cy FlexService' };
                return null; // crm_deals e.d. → dealVoorOrder slikt zijn eigen fouten
              },
              async run() {
                if (sql.startsWith('UPDATE service_orders SET status = ?')) order.status = args[0];
                return { meta: { changes: 1 } };
              },
              async all() { return { results: [] }; },
            };
          },
        };
      },
    };
    const token = await createSession(user.id, SECRET);
    const req = new Request(`${SITE_ORIGIN}/api/portal/order/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Origin: SITE_ORIGIN, Cookie: `${SESSION_COOKIE}=${token}` },
      body: JSON.stringify({ id: 'ord_1', intake: { werkgebied: { basis: 'Rotterdam', straal: 'Tot 50 km' }, volume: { volume_maand: 'Tot 5' } } }),
    });
    const res = await handlePortalApi(req, {
      PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, BREVO_API_KEY: 'k', TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '42',
    });
    expect(res.status).toBe(200);
    expect(order.status).toBe('ingediend');
    const tg = calls.find((c) => c.url.includes('api.telegram.org'));
    expect(tg).toBeTruthy();
    expect(tg.body.chat_id).toBe('42');
    expect(tg.body.text).toContain('Product: leadpartner · Exclusief');
    expect(tg.body.text).toContain('Werkgebied: Rotterdam · Tot 50 km');
    expect(tg.body.text).toContain('Volume: Tot 5/maand');
    expect(tg.body.text).toContain('/admin/aanvragen?order=ord_1');
    expect(calls.some((c) => c.url.includes('api.brevo.com'))).toBe(true);
  });
});
