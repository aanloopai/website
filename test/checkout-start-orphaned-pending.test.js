// E2E-bevinding (live test, 2026-07-23): de EERSTE Mollie-betaling van een order
// kan mislukken NA de subscriptions-INSERT maar VÓÓR de payments-INSERT — de
// Mollie `POST /payments` gooide (bv. "No suitable payment methods found", HTTP
// 422). onFailed() draait dan nooit (er bestaat geen Mollie-payment om te
// mislukken), dus de rij blijft op 'pending_payment' staan ZONDER payments-rij.
// handleCheckoutStart 409'de daarna voorgoed ("Er is al een checkout gestart"):
// de klant kon nooit meer betalen — de order was permanent gebrickt.
//
// Fix: pending_payment zonder herbruikbare open/pending betaling wordt via een
// compare-and-swap (pending_payment -> canceled) vrijgegeven en daarna door het
// bestaande canceled-hergebruikpad opnieuw opgestart.
//
// Review-bevinding (HIGH): een ONTBREKENDE lokale payments-rij is NIET het bewijs
// dat er geen Mollie-betaling bestaat — de Mollie-POST kan slagen terwijl alleen
// de lokale INSERT faalt. Daarom vraagt de fix, als er geen lokale rij is maar wel
// een Mollie-customer, eerst aan Mollie of er nog een betaling op DEZE order loopt
// (open/pending -> hergebruik; paid/authorized -> 409) vóór hij een nieuwe start.
import { describe, it, expect, afterEach } from 'vitest';
import { handleCheckoutStart, berekenEersteBetaling } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function makeDbStub({ order, pendingSub, existingPayment = null, customer }) {
  const calls = [];
  function respond(sql) {
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      return { first: async () => order };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      return { first: async () => pendingSub };
    }
    if (sql.includes('FROM subscriptions WHERE customer_id = ? AND product_key = ?')) {
      return { first: async () => null }; // geen ander lopend abonnement
    }
    if (sql.includes('FROM payments WHERE subscription_id = ?')) {
      return { first: async () => existingPayment };
    }
    if (sql.includes('FROM customers WHERE id = ?')) {
      return { first: async () => customer };
    }
    if (sql.startsWith('UPDATE customers SET mollie_customer_id')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('UPDATE subscriptions SET')) {
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

// getPaymentStatus: status voor GET /payments/:id (lokale-rij-pad).
// customerPayments: array die GET /customers/:id/payments teruggeeft (Mollie-side lookup).
// lookupThrows: laat de customer-payments-lookup gooien.
function makeFetchStub({ getPaymentStatus = null, getPaymentHasCheckout = true, customerPayments = [], lookupThrows = false } = {}) {
  return async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    if (u.endsWith('/profiles/me')) return jsonRes({ id: 'pfl_test123' });
    if (u.endsWith('/customers') && method === 'POST') return jsonRes({ id: 'cst_test123' });
    if (/\/customers\/[^/]+\/payments/.test(u) && method === 'GET') {
      if (lookupThrows) return { ok: false, status: 500, text: async () => 'boom' };
      return jsonRes({ _embedded: { payments: customerPayments } });
    }
    if (/\/payments\/tr_/.test(u) && method === 'GET') {
      return jsonRes({
        id: 'tr_bestaand',
        status: getPaymentStatus,
        _links: getPaymentHasCheckout ? { checkout: { href: 'https://mollie.com/checkout/select-method/bestaand' } } : {},
      });
    }
    if (u.endsWith('/payments') && method === 'POST') {
      const body = JSON.parse(opts.body);
      return jsonRes({ id: 'tr_nieuw', status: 'open', amount: body.amount, _links: { checkout: { href: 'https://mollie.com/checkout/select-method/nieuw' } } });
    }
    throw new Error(`makeFetchStub: onverwachte fetch: ${method} ${u}`);
  };
}
function makeRequest(orderId, extra = {}) {
  return { json: async () => ({ order_id: orderId, ...extra }) };
}

const customer = { id: 'cus_1', bedrijf: 'Testbedrijf', factuur_email: 'test@example.com', mollie_customer_id: 'cst_existing' };
const user = { role: 'eigenaar', customer_id: 'cus_1', naam: 'Test User', email: 'test@example.com' };
const baseOrder = { id: 'ord_orphan_1', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };

// pendingSub mét mollie_customer_id: de eerste poging maakte de Mollie-customer al aan.
function pendingSub(id) { return { id, status: 'pending_payment', mollie_customer_id: 'cst_existing' }; }

async function runFetch(fetchStub) {
  let paymentPost = false;
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).endsWith('/payments') && (opts.method || 'GET') === 'POST') paymentPost = true;
    return fetchStub(url, opts);
  };
  return () => paymentPost;
}

describe('handleCheckoutStart — verweesde pending_payment (eerste betaling brak vóór de payments-INSERT)', () => {
  it('geen lokale rij + Mollie bevestigt GEEN betaling → geeft vrij en start een NIEUWE checkout', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const { maandInclCent } = berekenEersteBetaling(tier);
    const db = makeDbStub({ order: { ...baseOrder }, pendingSub: pendingSub('sub_orphan_1'), existingPayment: null, customer });
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    const paidPost = await runFetch(makeFetchStub({ customerPayments: [] }));

    const res = await handleCheckoutStart(makeRequest('ord_orphan_1'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toContain('/nieuw');
    expect(paidPost()).toBe(true);
    // Vrijgegeven via CAS pending_payment -> canceled, daarna hergebruikt (geen tweede INSERT).
    expect(db.calls.some((c) => c.sql.startsWith("UPDATE subscriptions SET status = 'canceled'"))).toBe(true);
    expect(db.calls.some((c) => c.sql.startsWith('INSERT INTO subscriptions'))).toBe(false);
    expect(maandInclCent).toBeGreaterThan(0);
  });

  it('HIGH-regressie: geen lokale rij MAAR Mollie heeft nog een OPEN betaling op deze order → hergebruikt die URL, start GEEN tweede', async () => {
    const db = makeDbStub({ order: { ...baseOrder, id: 'ord_orphan_hi1' }, pendingSub: pendingSub('sub_hi1'), existingPayment: null, customer });
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    const openAtMollie = [{ status: 'open', metadata: { order_id: 'ord_orphan_hi1' }, _links: { checkout: { href: 'https://mollie.com/checkout/select-method/wees' } } }];
    const paidPost = await runFetch(makeFetchStub({ customerPayments: openAtMollie }));

    const res = await handleCheckoutStart(makeRequest('ord_orphan_hi1'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toContain('/wees');
    expect(paidPost()).toBe(false); // GEEN tweede betaling
    expect(db.calls.some((c) => c.sql.startsWith('UPDATE subscriptions SET'))).toBe(false);
  });

  it('HIGH-regressie: geen lokale rij MAAR Mollie heeft al een BETAALDE betaling op deze order → 409, geen tweede', async () => {
    const db = makeDbStub({ order: { ...baseOrder, id: 'ord_orphan_hi2' }, pendingSub: pendingSub('sub_hi2'), existingPayment: null, customer });
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    const paidAtMollie = [{ status: 'paid', metadata: { order_id: 'ord_orphan_hi2' }, _links: {} }];
    const paidPost = await runFetch(makeFetchStub({ customerPayments: paidAtMollie }));

    const res = await handleCheckoutStart(makeRequest('ord_orphan_hi2'), env, user);

    expect(res.status).toBe(409);
    expect(paidPost()).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('UPDATE subscriptions SET'))).toBe(false);
  });

  it('geen lokale rij + Mollie-lookup GOOIT → 409 (nooit blind een tweede betaling)', async () => {
    const db = makeDbStub({ order: { ...baseOrder, id: 'ord_orphan_hi3' }, pendingSub: pendingSub('sub_hi3'), existingPayment: null, customer });
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    const paidPost = await runFetch(makeFetchStub({ lookupThrows: true }));

    const res = await handleCheckoutStart(makeRequest('ord_orphan_hi3'), env, user);

    expect(res.status).toBe(409);
    expect(paidPost()).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('UPDATE subscriptions SET'))).toBe(false);
  });

  it('regressie: lokale rij met OPEN checkout hergebruikt zijn URL en start GEEN tweede betaling', async () => {
    const db = makeDbStub({ order: { ...baseOrder, id: 'ord_orphan_2' }, pendingSub: pendingSub('sub_orphan_2'), existingPayment: { id: 'tr_bestaand' }, customer });
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    const paidPost = await runFetch(makeFetchStub({ getPaymentStatus: 'open' }));

    const res = await handleCheckoutStart(makeRequest('ord_orphan_2'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toContain('/bestaand');
    expect(paidPost()).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('UPDATE subscriptions SET'))).toBe(false);
  });

  it('regressie: lokale rij met OPEN status maar ZONDER checkout-URL → 409 (nooit een tweede betaling)', async () => {
    const db = makeDbStub({ order: { ...baseOrder, id: 'ord_orphan_4' }, pendingSub: pendingSub('sub_orphan_4'), existingPayment: { id: 'tr_bestaand' }, customer });
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    const paidPost = await runFetch(makeFetchStub({ getPaymentStatus: 'open', getPaymentHasCheckout: false }));

    const res = await handleCheckoutStart(makeRequest('ord_orphan_4'), env, user);

    expect(res.status).toBe(409);
    expect(paidPost()).toBe(false);
  });

  it('regressie: lokale rij met al BETAALDE (paid) betaling → 409 "wordt verwerkt", geen tweede', async () => {
    const db = makeDbStub({ order: { ...baseOrder, id: 'ord_orphan_3' }, pendingSub: pendingSub('sub_orphan_3'), existingPayment: { id: 'tr_bestaand' }, customer });
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    const paidPost = await runFetch(makeFetchStub({ getPaymentStatus: 'paid' }));

    const res = await handleCheckoutStart(makeRequest('ord_orphan_3'), env, user);

    expect(res.status).toBe(409);
    expect(paidPost()).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('UPDATE subscriptions SET'))).toBe(false);
  });
});
