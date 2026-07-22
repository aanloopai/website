// Punt C (eindreview #2, important): de klant+product-guard uit de vorige
// ronde (handleCheckoutStart, mollie.js) filtert alleen op product_key. Maar
// Starter en Groei van emma-telefoon delen die product_key — dus een klant op
// Starter die in het portaal een Groei-order aanmaakt en wil upgraden, kreeg
// een 409 "Er loopt al een abonnement voor dit product op uw account". Zijn
// enige uitweg was opzeggen en opnieuw kopen, inclusief een nieuwe
// setup-fee.
//
// Het gat dat de guard moest dichten zat uitsluitend bij funnelorders
// (dezelfde tier, twee voorstellen, twee orders, allebei betaald). Deze test
// legt beide kanten vast: een upgrade naar een ANDERE tier mag door, een
// dubbelkoop van DEZELFDE tier blijft geweigerd.
//
// De mock filtert (anders dan de andere checkout-start-*-tests) zelf op de
// bind-args i.p.v. een canned antwoord terug te geven — zo bewijst deze test
// daadwerkelijk dat de query tier meebindt, niet alleen dat de mock toevallig
// het juiste antwoord teruggeeft.
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

// `bestaandeSub`: { customer_id, product_key, tier, status } — geseed alsof
// hij aan een ANDERE order hangt. De guard-query filtert hier ECHT op de
// gebonden args (customer_id, product_key, tier), zodat de test rood staat
// zolang de productiecode geen tier meebindt.
function makeDbStub({ order, bestaandeSub = null, customer }) {
  const calls = [];
  function respond(sql) {
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      return { first: async () => order };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      return { first: async () => null };
    }
    if (sql.includes('FROM subscriptions WHERE customer_id = ? AND product_key = ?')) {
      return {
        first: async () => {
          if (!bestaandeSub) return null;
          const args = calls[calls.length - 1].args;
          const [custId, productKey, tier] = args;
          const statusOk = bestaandeSub.status === 'pending_payment' || bestaandeSub.status === 'active';
          const productMatch = bestaandeSub.customer_id === custId
            && bestaandeSub.product_key === productKey
            && statusOk;
          if (!productMatch) return null;
          // Repliceert de echte SQL: vóór de fix bindt de query geen tier
          // (2 args) en heeft de query-tekst geen "AND tier = ?" — elke
          // tier van hetzelfde product_key blokkeert dan. Ná de fix bindt
          // hij 3 args en moet de tier exact matchen.
          if (args.length >= 3) {
            return bestaandeSub.tier === tier ? { id: bestaandeSub.id } : null;
          }
          return { id: bestaandeSub.id };
        },
      };
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
          };
        },
      };
    },
  };
}

describe('handleCheckoutStart — klant+product-guard is tier-specifiek', () => {
  it('portaal-upgrade: Starter -> Groei-order mag door, ook al loopt Starter nog', async () => {
    const order = { id: 'ord_upgrade', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Groei', status: 'concept' };
    const customer = { id: 'cus_1', bedrijf: 'Testbedrijf', factuur_email: 'test@example.com', mollie_customer_id: null };
    const bestaandeSub = { id: 'sub_starter', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'active' };
    const db = makeDbStub({ order, bestaandeSub, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_1', naam: 'Test User', email: 'test@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_upgrade'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checkoutUrl).toBeTruthy();
  });

  it('funnel-dubbelkoop: DEZELFDE tier nogmaals afrekenen blijft geweigerd', async () => {
    const order = { id: 'ord_dup', customer_id: 'cus_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_2', bedrijf: 'Testbedrijf 2', factuur_email: 'test2@example.com', mollie_customer_id: null };
    const bestaandeSub = { id: 'sub_starter_2', customer_id: 'cus_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'pending_payment' };
    const db = makeDbStub({ order, bestaandeSub, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_2', naam: 'Test User 2', email: 'test2@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    let paymentCreated = false;
    globalThis.fetch = async (url, opts = {}) => {
      if (String(url).endsWith('/payments') && (opts.method || 'GET') === 'POST') paymentCreated = true;
      return makeFetchStub()(url, opts);
    };

    const res = await handleCheckoutStart(makeRequest('ord_dup'), env, user);

    expect(res.status).toBe(409);
    expect(paymentCreated).toBe(false);
  });
});
