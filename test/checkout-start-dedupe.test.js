// Punt 2 (eindreview): mintKlantEnOrder (voorstel-verify.js) checkt op een
// bestaand abonnement vóórdat het de order aanmaakt, maar een
// abonnementsrij ontstaat pas in handleCheckoutStart. Twee orders voor
// dezelfde klant+product (bv. wizard twee keer ingevuld, eerste checkout
// nooit gestart) konden zo allebei hun eigen abonnement + betaling krijgen —
// twee actieve abonnementen voor hetzelfde product. handleCheckoutStart moet
// daarom ZELF ook op klant+product controleren, niet alleen op order_id.
import { describe, it, expect, afterEach } from 'vitest';
import { handleCheckoutStart } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Zelfde D1-stubstijl als test/checkout-start-bind.test.js.
function makeDbStub({ order, existingSubForOrder = null, existingSubForCustomerProduct = null, customer, voorstel = null }) {
  const calls = [];
  function respond(sql) {
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      return { first: async () => order };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      return { first: async () => existingSubForOrder };
    }
    if (sql.includes('FROM subscriptions WHERE customer_id = ? AND product_key = ?')) {
      return { first: async () => existingSubForCustomerProduct };
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

describe('handleCheckoutStart — dubbel-abonnement-guard per klant+product', () => {
  it('weigert een tweede checkout voor hetzelfde klant+product wanneer een ANDERE order al een pending/actief abonnement heeft', async () => {
    const order = { id: 'ord_2', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_1', bedrijf: 'Testbedrijf', factuur_email: 'test@example.com', mollie_customer_id: null };
    // De bestaande sub hangt aan een ANDERE order (ord_1) — de per-order check
    // (existingSubForOrder) ziet dus niets, alleen de klant+product-brede check wel.
    const existingSubForCustomerProduct = { id: 'sub_van_ord_1', status: 'pending_payment' };
    const db = makeDbStub({ order, existingSubForOrder: null, existingSubForCustomerProduct, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_1', naam: 'Test User', email: 'test@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };

    let paymentCreated = false;
    globalThis.fetch = async (url, opts = {}) => {
      if (String(url).endsWith('/payments') && (opts.method || 'GET') === 'POST') paymentCreated = true;
      return makeFetchStub()(url, opts);
    };

    const res = await handleCheckoutStart(makeRequest('ord_2'), env, user);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(paymentCreated).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('INSERT INTO subscriptions'))).toBe(false);
  });

  it('staat gewoon toe wanneer er geen bestaand abonnement is voor klant+product', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    expect(tier).toBeTruthy();
    const order = { id: 'ord_3', customer_id: 'cus_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_2', bedrijf: 'Testbedrijf 2', factuur_email: 'test2@example.com', mollie_customer_id: 'cst_existing' };
    const db = makeDbStub({ order, existingSubForOrder: null, existingSubForCustomerProduct: null, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_2', naam: 'Test User 2', email: 'test2@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_3'), env, user);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checkoutUrl).toBeTruthy();
  });
});
