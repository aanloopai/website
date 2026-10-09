// Admin API voor overeenkomsten: aanmaken (3 gerenderde documenten met sha256),
// versturen (status + mail), PATCH-bevriezing na eerste akkoord, staff-only.
import {
  describe, it, expect, vi, afterEach, beforeEach,
} from 'vitest';

vi.mock('../src/lib/agreement-pdf.js', () => ({
  buildAgreementPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
}));

const { handleOvereenkomstAdminApi, AGREEMENT_VARIABLE_KEYS } = await import('../src/lib/overeenkomst-admin-routes.js');
const { handleAdminApi } = await import('../src/lib/admin-routes.js');

const STAFF = {
  id: 'usr_staff', email: 'm@aanloopai.nl', naam: 'M', role: 'staff',
};
const originalFetch = globalThis.fetch;
let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('{}', { status: 201 }));
  globalThis.fetch = fetchMock;
});
afterEach(() => { globalThis.fetch = originalFetch; });

const TEMPLATES = [
  { id: 'tpl_a', slug: 'overeenkomst', version: '1.0', title: 'Overeenkomst van opdracht', body_markdown: '# Overeenkomst\n\nKlant: {{klant_bedrijfsnaam}} ({{klant_kvk}}). Prijs {{prijs_website}}. Adres {{aanloopai_adres}}. {{onbekend_veld}}' },
  { id: 'tpl_b', slug: 'algemene-voorwaarden', version: '1.0', title: 'Algemene Voorwaarden AanloopAI', body_markdown: '# AV\n\nDatum {{datum}}' },
  { id: 'tpl_c', slug: 'privacy-verwerker', version: '1.0', title: 'Privacyverklaring en Verwerkersovereenkomst', body_markdown: '# Privacy\n\nOpdrachtgever {{klant_bedrijfsnaam}}' },
].map((t, i) => ({ ...t, created_at: 1000 + i }));

function makeEnv() {
  const s = {
    templates: TEMPLATES.map((t) => ({ ...t })),
    customers: [{
      id: 'cust_1', bedrijf: 'Foralle Naarden BV', kvk: '12345678', btw_id: null, adres: 'Laan 1', postcode: '1412 GW', stad: 'Naarden', telefoon: '0612345678',
    }],
    users: [{
      id: 'usr_o', customer_id: 'cust_1', email: 'ron@foralle.nl', naam: 'Ron Houter', role: 'eigenaar',
    }],
    agreements: [], docs: [], consents: [], audit: [], assets: {},
  };
  const respond = (sql, a) => {
    const q = sql.replace(/\s+/g, ' ').trim();
    if (q.startsWith('SELECT id, bedrijf, kvk')) return { first: () => s.customers.find((c) => c.id === a[0]) || null };
    if (q.includes("FROM users WHERE customer_id = ? AND role = 'eigenaar'")) return { all: () => ({ results: s.users.filter((u) => u.customer_id === a[0]) }) };
    if (q.includes('FROM agr_templates WHERE slug = ?')) {
      const rows = s.templates.filter((t) => t.slug === a[0]).sort((x, y) => y.created_at - x.created_at);
      return { first: () => rows[0] || null };
    }
    if (q.startsWith('INSERT INTO agreements ')) {
      return {
        run: () => {
          s.agreements.push({
            id: a[0], customer_id: a[1], title: a[2], status: a[3], variables_json: a[4], created_by: a[5], created_at: a[6], sent_at: null,
          });
        },
      };
    }
    if (q.startsWith('INSERT INTO agreement_documents')) {
      return {
        run: () => {
          s.docs.push({
            id: a[0], agreement_id: a[1], template_id: a[2], template_slug: a[3], template_version: a[4], order_index: a[5], title: a[6], rendered_markdown: a[7], content_sha256: a[8],
          });
        },
      };
    }
    if (q.startsWith('SELECT * FROM agreements WHERE id = ?')) return { first: () => s.agreements.find((x) => x.id === a[0]) || null };
    if (q.startsWith('SELECT COUNT(*) AS n FROM agr_consents')) return { first: () => ({ n: s.consents.length }) };
    if (q.startsWith('SELECT COUNT(*) AS n FROM agreement_documents')) return { first: () => ({ n: s.docs.filter((d) => d.agreement_id === a[0]).length }) };
    if (q.startsWith('SELECT d.id, t.body_markdown')) {
      return {
        all: () => ({
          results: s.docs.filter((d) => d.agreement_id === a[0])
            .map((d) => ({ id: d.id, body_markdown: s.templates.find((t) => t.id === d.template_id).body_markdown })),
        }),
      };
    }
    if (q.startsWith('UPDATE agreements SET title = ?')) {
      return { run: () => { const ag = s.agreements.find((x) => x.id === a[2]); ag.title = a[0]; ag.variables_json = a[1]; } };
    }
    if (q.startsWith('UPDATE agreement_documents SET rendered_markdown')) {
      return { run: () => { const d = s.docs.find((x) => x.id === a[2]); d.rendered_markdown = a[0]; d.content_sha256 = a[1]; } };
    }
    if (q.startsWith("UPDATE agreements SET status = 'sent'")) {
      return { run: () => { const ag = s.agreements.find((x) => x.id === a[1] && x.status === 'draft'); if (ag) { ag.status = 'sent'; ag.sent_at = a[0]; } } };
    }
    if (q.startsWith('INSERT OR REPLACE INTO portal_assets')) {
      return { run: () => { s.assets[a[0]] = { value_b64: a[1], mime: a[2], created_at: a[3] }; } };
    }
    if (q.startsWith('SELECT created_at FROM portal_assets')) return { first: () => (s.assets[a[0]] ? { created_at: s.assets[a[0]].created_at } : null) };
    if (q.startsWith('SELECT value_b64, mime FROM portal_assets')) return { first: () => s.assets[a[0]] || null };
    if (q.startsWith('INSERT INTO portal_audit_log')) return { run: () => { s.audit.push(a); } };
    throw new Error(`stub: onbekende SQL: ${q}`);
  };
  const db = {
    prepare(sql) {
      const q0 = sql.replace(/\s+/g, ' ').trim();
      if (q0.startsWith('CREATE ')) return { run: async () => ({}) };
      if (q0.startsWith('SELECT count(*) AS n FROM agr_templates')) return { first: async () => ({ n: 3 }) };
      return {
        bind: (...a) => {
          const r = respond(sql, a);
          return { first: async () => r.first(), all: async () => r.all(), run: async () => r.run() };
        },
      };
    },
    async batch(stmts) { for (const st of stmts) await st.run(); return []; },
  };
  return { env: { PORTAL_DB: db, BREVO_API_KEY: 'k' }, s };
}

const url = (p) => new URL(`https://aanloopai.nl${p}`);
const req = (method, body) => ({ method, headers: new Headers(), json: async () => body });

async function create(env, variables = {}) {
  const res = await handleOvereenkomstAdminApi(
    req('POST', { customer_id: 'cust_1', title: 'Website Foralle', variables_json: variables }), env, STAFF, url('/api/admin/overeenkomst'),
  );
  return { res, body: await res.json() };
}

describe('overeenkomst-admin-routes', () => {
  it('exposeert alle variabele-sleutels uit SPEC §6', () => {
    expect(AGREEMENT_VARIABLE_KEYS).toHaveLength(24);
    expect(AGREEMENT_VARIABLE_KEYS).toContain('betaaltermijn_dagen');
  });

  it('create: 3 documenten, variabelen ingevuld, sha256 gezet, klantgegevens voorgevuld', async () => {
    const { env, s } = makeEnv();
    const { res, body } = await create(env, { prijs_website: '€ 4.500' });
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.id).toMatch(/^agr_/);
    expect(s.docs).toHaveLength(3);
    expect(s.docs.map((d) => d.template_slug)).toEqual(['overeenkomst', 'algemene-voorwaarden', 'privacy-verwerker']);
    const d1 = s.docs[0];
    expect(d1.rendered_markdown).toContain('Foralle Naarden BV (12345678)');
    expect(d1.rendered_markdown).toContain('€ 4.500');
    expect(d1.rendered_markdown).toContain('Blokfluit 31, 3068 KZ Rotterdam');
    expect(d1.rendered_markdown).toContain('[ontbreekt: onbekend_veld]');
    expect(s.docs.every((d) => /^[0-9a-f]{64}$/.test(d.content_sha256))).toBe(true);
    const vars = JSON.parse(s.agreements[0].variables_json);
    expect(Object.keys(vars)).toEqual(AGREEMENT_VARIABLE_KEYS);
    expect(vars.klant_contact_email).toBe('ron@foralle.nl');
    expect(vars.klant_plaats).toBe('Naarden');
    expect(s.agreements[0].status).toBe('draft');
    expect(s.audit.length).toBeGreaterThan(0);
  });

  it('create: onbekende klant -> 404', async () => {
    const { env } = makeEnv();
    const res = await handleOvereenkomstAdminApi(
      req('POST', { customer_id: 'cust_x', title: 'T' }), env, STAFF, url('/api/admin/overeenkomst'),
    );
    expect(res.status).toBe(404);
  });

  it('versturen: draft -> sent en Brevo-mail naar eigenaar met inloglink', async () => {
    const { env, s } = makeEnv();
    const { body } = await create(env);
    const res = await handleOvereenkomstAdminApi(req('POST', { id: body.id }), env, STAFF, url('/api/admin/overeenkomst/versturen'));
    expect(res.status).toBe(200);
    expect(s.agreements[0].status).toBe('sent');
    expect(s.agreements[0].sent_at).toBeTypeOf('number');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.to[0].email).toBe('ron@foralle.nl');
    expect(sent.subject).toBe('Je AanloopAI-portaal staat klaar');
    expect(sent.htmlContent).toContain(`/portal/overeenkomst/?id=${body.id}`);
  });

  it('versturen: mailfout -> 502 en status blijft draft', async () => {
    const { env, s } = makeEnv();
    const { body } = await create(env);
    fetchMock.mockResolvedValue(new Response('nee', { status: 500 }));
    const res = await handleOvereenkomstAdminApi(req('POST', { id: body.id }), env, STAFF, url('/api/admin/overeenkomst/versturen'));
    expect(res.status).toBe(502);
    expect(s.agreements[0].status).toBe('draft');
  });

  it('PATCH: herrendert bij draft, geweigerd (409) zodra er een akkoord bestaat', async () => {
    const { env, s } = makeEnv();
    const { body } = await create(env);
    const ok = await handleOvereenkomstAdminApi(
      req('PATCH', { id: body.id, variables_json: { prijs_website: '€ 9.999' } }), env, STAFF, url('/api/admin/overeenkomst'),
    );
    expect(ok.status).toBe(200);
    expect(s.docs[0].rendered_markdown).toContain('€ 9.999');

    s.consents.push({ id: 'cns_1', agreement_document_id: s.docs[0].id });
    const before = s.docs[0].rendered_markdown;
    const res = await handleOvereenkomstAdminApi(
      req('PATCH', { id: body.id, variables_json: { prijs_website: '€ 1' } }), env, STAFF, url('/api/admin/overeenkomst'),
    );
    expect(res.status).toBe(409);
    expect(s.docs[0].rendered_markdown).toBe(before);
  });

  it('niet-staff -> 403 (module en dispatcher)', async () => {
    const { env } = makeEnv();
    const res = await handleOvereenkomstAdminApi(
      req('POST', { customer_id: 'cust_1', title: 'T' }), env, { id: 'usr_o', role: 'eigenaar' }, url('/api/admin/overeenkomst'),
    );
    expect(res.status).toBe(403);
    for (const p of ['/api/admin/overeenkomst', '/api/admin/aanlever', '/api/admin/portal-audit', '/api/admin/sjablonen']) {
      const r = await handleAdminApi(new Request(`https://aanloopai.nl${p}`), { PORTAL_DB: env.PORTAL_DB, PORTAL_SESSION_SECRET: 's' });
      expect(r.status).toBe(403);
    }
  });

  describe('handtekening AanloopAI', () => {
    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const upload = (env, bytes, user = STAFF) => {
      const fd = new FormData();
      fd.append('file', new Blob([bytes]), 'sig.png');
      return handleOvereenkomstAdminApi({ method: 'POST', headers: new Headers(), formData: async () => fd }, env, user, url('/api/admin/sjablonen/handtekening'));
    };

    it('niet-PNG -> 400, niets opgeslagen', async () => {
      const { env, s } = makeEnv();
      const res = await upload(env, new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]));
      expect(res.status).toBe(400);
      expect(s.assets).toEqual({});
    });

    it('te groot (>200 KB) -> 400', async () => {
      const { env, s } = makeEnv();
      const big = new Uint8Array(200 * 1024 + 1);
      big.set(PNG);
      expect((await upload(env, big)).status).toBe(400);
      expect(s.assets).toEqual({});
    });

    it('PNG wordt opgeslagen als base64 + audit, status en afbeelding werken', async () => {
      const { env, s } = makeEnv();
      const res = await upload(env, PNG);
      expect(res.status).toBe(200);
      expect(Buffer.from(s.assets['handtekening-aanloopai'].value_b64, 'base64')).toEqual(Buffer.from(PNG));
      expect(s.assets['handtekening-aanloopai'].mime).toBe('image/png');
      expect(s.audit.some((a) => a.includes('handtekening_geupload'))).toBe(true);
      const st = await (await handleOvereenkomstAdminApi(req('GET'), env, STAFF, url('/api/admin/sjablonen/handtekening'))).json();
      expect(st.aanwezig).toBe(true);
      const img = await handleOvereenkomstAdminApi(req('GET'), env, STAFF, url('/api/admin/sjablonen/handtekening/afbeelding'));
      expect(img.headers.get('Cache-Control')).toBe('private, no-store');
      expect(new Uint8Array(await img.arrayBuffer())).toEqual(PNG);
    });

    it('niet-staff -> 403', async () => {
      const { env, s } = makeEnv();
      expect((await upload(env, PNG, { id: 'usr_o', role: 'eigenaar' })).status).toBe(403);
      expect(s.assets).toEqual({});
    });
  });
});
