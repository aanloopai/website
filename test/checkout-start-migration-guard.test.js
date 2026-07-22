// Punt B (eindreview #2, critical, deploy-volgorde): handleCheckoutStart
// selecteert sinds de vorige ronde `voorstel_id` in zijn hoofdquery, buiten
// elk try-blok. Bestaat die kolom nog niet in de database (migratie 0015 nog
// niet toegepast), dan gooit D1 en kreeg IEDERE klant een 500 bij het
// betalen — ook klanten die niets met de self-serve funnel te maken hebben.
// Vóór die ronde degradeerde een branch zonder migratie juist netjes.
//
// De fix vangt die ene query af: gooit hij, dan wordt teruggevallen op
// dezelfde query zonder voorstel_id — de rest van handleCheckoutStart werkt
// dan gewoon door (order.voorstel_id is dan undefined, en de funnel-
// prijsvergelijking verderop is al voorwaardelijk op die kolom). Een
// ontbrekende kolom betekent dus hooguit "geen funnel-prijscontrole", nooit
// "gewone klant kan niet betalen".
import { describe, it, expect, afterEach } from 'vitest';
import { handleCheckoutStart } from '../src/lib/mollie.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function jsonRes(obj) {
  return { ok: true, status: 200, text: async () => JSON.stringify(obj) };
}
function makeFetchStub() {
  return async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    if (u.endsWith('/profiles/me')) return jsonRes({ id: 'pfl_test123' });
    if (u.endsWith('/customers') && method === 'POST') return jsonRes({ id: 'cst_test123' });
    if (u.endsWith('/payments') && method === 'POST') {
      const body = JSON.parse(opts.body);
      return jsonRes({ id: 'tr_test123', status: 'open', amount: body.amount, _links: { checkout: { href: 'https://mollie.com/checkout/select-method/test123' } } });
    }
    throw new Error(`makeFetchStub: onverwachte fetch: ${method} ${u}`);
  };
}
function makeRequest(orderId) {
  return { json: async () => ({ order_id: orderId }) };
}

// `simuleerOntbrekendeKolom`: laat de HOOFDquery (die `voorstel_id`
// selecteert) gooien, precies zoals D1 doet bij "no such column: voorstel_id"
// wanneer migratie 0015 nog niet is toegepast.
function makeDbStub({ order, simuleerOntbrekendeKolom = false }) {
  const calls = [];
  function respond(sql) {
    if (sql.includes(', voorstel_id FROM service_orders WHERE id = ? AND customer_id = ?')) {
      if (simuleerOntbrekendeKolom) {
        return { first: async () => { throw new Error('D1_ERROR: no such column: voorstel_id'); } };
      }
      return { first: async () => order };
    }
    if (sql === 'SELECT id, customer_id, product_key, tier, status FROM service_orders WHERE id = ? AND customer_id = ?') {
      return { first: async () => { const { voorstel_id, ...zonder } = order; return zonder; } };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      return { first: async () => null };
    }
    if (sql.includes('FROM subscriptions WHERE customer_id = ? AND product_key = ?')) {
      return { first: async () => null };
    }
    if (sql.includes('FROM voorstellen WHERE id = ?')) {
      return { first: async () => { throw new Error('mag niet worden bevraagd zonder voorstel_id'); } };
    }
    if (sql.includes('FROM customers WHERE id = ?')) {
      return { first: async () => ({ id: order.customer_id, bedrijf: 'Testbedrijf', factuur_email: 'test@example.com', mollie_customer_id: null }) };
    }
    if (sql.startsWith('UPDATE customers SET mollie_customer_id')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('INSERT INTO subscriptions')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('INSERT INTO payments')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    throw new Error(`makeDbStub: geen canned-antwoord voor SQL: ${sql}`);
  }
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          const r = respond(sql);
          return {
            first: r.first || (async () => { throw new Error(`geen .first() voor: ${sql}`); }),
            run: r.run || (async () => { throw new Error(`geen .run() voor: ${sql}`); }),
          };
        },
      };
    },
  };
}

describe('handleCheckoutStart — robuust tegen een nog niet toegepaste migratie 0015 (voorstel_id)', () => {
  it('ontbrekende voorstel_id-kolom: een GEWONE klant kan gewoon nog betalen (geen 500)', async () => {
    const order = { id: 'ord_1', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const db = makeDbStub({ order, simuleerOntbrekendeKolom: true });
    const user = { role: 'eigenaar', customer_id: 'cus_1', naam: 'Test User', email: 'test@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_1'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checkoutUrl).toBeTruthy();
    // De funnel-prijsvergelijking (SELECT ... FROM voorstellen) mag nooit
    // geraakt zijn — er is geen voorstel_id om op te vergelijken.
    expect(db.calls.some((c) => c.sql.includes('FROM voorstellen'))).toBe(false);
  });

  it('voorstel_id-kolom bestaat wél: gedrag ongewijzigd — order zonder voorstel_id blijft de gewone checkout', async () => {
    const order = { id: 'ord_2', customer_id: 'cus_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept', voorstel_id: null };
    const db = makeDbStub({ order, simuleerOntbrekendeKolom: false });
    const user = { role: 'eigenaar', customer_id: 'cus_2', naam: 'Test User 2', email: 'test2@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_2'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
