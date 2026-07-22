// Punt 3 (eindreview): het voorstel bevriest maandbedrag en setup-fee 14
// dagen, maar de checkout herberekent uit de actuele catalogus (getCatalogTier).
// Wijzigt de prijs in die periode, dan zag de klant €497 op zijn voorstel en
// stond er zonder deze fix een ander bedrag in Mollie — zonder tussenscherm,
// want de checkout start automatisch (autostart=1 na de magic link).
//
// De vergelijking zit in handleCheckoutStart (mollie.js), niet op de
// voorstelpagina: dat is de enige plek die altijd wordt geraakt, ook wanneer
// iemand de checkout-URL rechtstreeks opent (autostart, of een oude
// bookmark/e-maillink) zonder ooit de voorstelpagina te laden.
import { describe, it, expect, afterEach } from 'vitest';
import { handleCheckoutStart, berekenEersteBetaling } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function makeDbStub({ order, voorstel = null, customer }) {
  const calls = [];
  function respond(sql) {
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      return { first: async () => order };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      return { first: async () => null };
    }
    if (sql.includes('FROM subscriptions WHERE customer_id = ? AND product_key = ?')) {
      return { first: async () => null };
    }
    if (sql.includes('FROM voorstellen WHERE id = ?')) {
      return { first: async () => voorstel };
    }
    if (sql.includes('FROM customers WHERE id = ?')) {
      return { first: async () => customer };
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
            all: r.all || (async () => { throw new Error(`geen .all() voor: ${sql}`); }),
          };
        },
      };
    },
  };
}

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

function makeRequest(orderId, extra = {}) {
  return { json: async () => ({ order_id: orderId, ...extra }) };
}

describe('handleCheckoutStart — prijsvergelijking voorstel vs. actuele catalogus', () => {
  it('blokkeert automatisch doorsturen wanneer het bevroren voorstelbedrag afwijkt van de catalogus', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const order = { id: 'ord_prijs_1', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept', voorstel_id: 'vst_1' };
    const customer = { id: 'cus_1', bedrijf: 'Testbedrijf', factuur_email: 'test@example.com', mollie_customer_id: null };
    // Voorstel bevroor een lager maandbedrag dan wat nu in de catalogus staat.
    const voorstel = { prijs_cent: tier.prijsCent - 5000, setup_cent: tier.setupCent };
    const db = makeDbStub({ order, voorstel, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_1', naam: 'Test User', email: 'test@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };

    let paymentCreated = false;
    globalThis.fetch = async (url, opts = {}) => {
      if (String(url).endsWith('/payments') && (opts.method || 'GET') === 'POST') paymentCreated = true;
      return makeFetchStub()(url, opts);
    };

    const res = await handleCheckoutStart(makeRequest('ord_prijs_1'), env, user);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.priceChanged).toBe(true);
    expect(paymentCreated).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('INSERT INTO subscriptions'))).toBe(false);
  });

  it('laat de checkout gewoon doorgaan wanneer het bevroren voorstelbedrag nog klopt', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const order = { id: 'ord_prijs_2', customer_id: 'cus_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept', voorstel_id: 'vst_2' };
    const customer = { id: 'cus_2', bedrijf: 'Testbedrijf 2', factuur_email: 'test2@example.com', mollie_customer_id: 'cst_existing' };
    const voorstel = { prijs_cent: tier.prijsCent, setup_cent: tier.setupCent };
    const db = makeDbStub({ order, voorstel, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_2', naam: 'Test User 2', email: 'test2@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_prijs_2'), env, user);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checkoutUrl).toBeTruthy();
  });

  it('gaat alsnog door tegen het NIEUWE bedrag wanneer de klant expliciet confirm_price meestuurt', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const { totaalInclCent } = berekenEersteBetaling(tier);
    const order = { id: 'ord_prijs_3', customer_id: 'cus_3', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept', voorstel_id: 'vst_3' };
    const customer = { id: 'cus_3', bedrijf: 'Testbedrijf 3', factuur_email: 'test3@example.com', mollie_customer_id: 'cst_existing3' };
    const voorstel = { prijs_cent: tier.prijsCent - 5000, setup_cent: tier.setupCent };
    const db = makeDbStub({ order, voorstel, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_3', naam: 'Test User 3', email: 'test3@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };

    let capturedAmount = null;
    globalThis.fetch = async (url, opts = {}) => {
      if (String(url).endsWith('/payments') && (opts.method || 'GET') === 'POST') {
        capturedAmount = JSON.parse(opts.body).amount;
      }
      return makeFetchStub()(url, opts);
    };

    const res = await handleCheckoutStart(makeRequest('ord_prijs_3', { confirm_price: true }), env, user);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Het bedrag dat naar Mollie ging is het ACTUELE catalogusbedrag, niet het
    // (verouderde) bevroren voorstelbedrag.
    expect(capturedAmount.value).toBe((totaalInclCent / 100).toFixed(2));
  });

  it('vergelijkt niets voor een order zonder voorstel_id (bestaand portaalpad) — geen regressie', async () => {
    const order = { id: 'ord_portal_1', customer_id: 'cus_4', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept', voorstel_id: null };
    const customer = { id: 'cus_4', bedrijf: 'Testbedrijf 4', factuur_email: 'test4@example.com', mollie_customer_id: 'cst_existing4' };
    // Geen voorstel-fixture nodig — de query naar `voorstellen` mag hier
    // zelfs niet plaatsvinden; makeDbStub gooit als dat toch gebeurt.
    const db = makeDbStub({ order, voorstel: null, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_4', naam: 'Test User 4', email: 'test4@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_portal_1'), env, user);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
