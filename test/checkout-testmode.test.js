// TIJDELIJKE TEST-MODUS (PAYMENTS_BYPASS) — legt vast dat handleCheckoutStart
// de checkout end-to-end kan doorzetten ZONDER Mollie-call zolang de
// betaalmethoden nog niet zijn geactiveerd in het Mollie-dashboard. Zie
// mollie.js: de PAYMENTS_BYPASS-regel bovenaan handleCheckoutStart en
// handleTestModeCheckout() onderaan het bestand — één geïsoleerd, gemarkeerd
// blok, triviaal te verwijderen zodra Mollie live is.
//
// Zelfde D1-stubstijl als test/checkout-start-*.test.js (calls-array) plus
// het stateful-model uit test/mollie-order-confirmation-mail.test.js, omdat
// deze functie zowel de checkout-guards ALS de volledige onPaid()-keten
// (activation/invoice/mail/CRM) doorloopt.
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

const activateOrderMock = vi.fn();
vi.mock('../src/lib/activation.js', () => ({
  activateOrder: (...args) => activateOrderMock(...args),
}));

const dealWonVoorOrderMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/lib/crm.js', () => ({
  dealWonVoorOrder: (...args) => dealWonVoorOrderMock(...args),
}));

const sendMailMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/lib/portal-routes.js', () => ({
  sendMail: (...args) => sendMailMock(...args),
}));

const { handleCheckoutStart, berekenEersteBetaling } = await import('../src/lib/mollie.js');

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
beforeEach(() => {
  activateOrderMock.mockReset().mockResolvedValue({ status: 'wacht_op_klant', serviceId: 'svc_1', provisioned: true });
  dealWonVoorOrderMock.mockReset().mockResolvedValue(undefined);
  sendMailMock.mockReset().mockResolvedValue(undefined);
});

// Fetch die ALTIJD gooit — bewijst dat handleTestModeCheckout geen enkele
// externe (Mollie-)call maakt. sendMail loopt via de gemockte portal-routes,
// dus die kan ook nooit bij deze fetch uitkomen.
function throwingFetch() {
  return async (url, opts) => {
    throw new Error(`onverwachte fetch in TEST-MODUS: ${(opts && opts.method) || 'GET'} ${url}`);
  };
}

function makeDb({
  serviceOrders = [], subscriptions = [], payments = [], users = [], invoices = [],
} = {}) {
  const state = {
    serviceOrders: serviceOrders.map((o) => ({ ...o })),
    subscriptions: subscriptions.map((s) => ({ ...s })),
    payments: payments.map((p) => ({ ...p })),
    users: users.map((u) => ({ ...u })),
    invoices: invoices.map((i) => ({ ...i })),
    counters: {},
  };
  const calls = [];
  return {
    state,
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          return {
            async first() {
              if (sql.startsWith('SELECT id, customer_id, product_key, tier, status FROM service_orders WHERE id = ? AND customer_id = ?')) {
                const [id, custId] = args;
                return state.serviceOrders.find((o) => o.id === id && o.customer_id === custId) || null;
              }
              if (sql.startsWith('SELECT id, status FROM subscriptions WHERE order_id = ?')) {
                return state.subscriptions.find((s) => s.order_id === args[0]) || null;
              }
              if (sql.startsWith("SELECT id FROM subscriptions WHERE customer_id = ? AND product_key = ? AND tier = ? AND status IN ('pending_payment', 'active')")) {
                const [customerId, productKey, tierNaam] = args;
                const match = state.subscriptions.find((s) => s.customer_id === customerId
                  && s.product_key === productKey && s.tier === tierNaam
                  && (s.status === 'pending_payment' || s.status === 'active'));
                return match ? { id: match.id } : null;
              }
              if (sql.startsWith('SELECT * FROM subscriptions WHERE id = ?')) {
                return state.subscriptions.find((s) => s.id === args[0]) || null;
              }
              if (sql.startsWith('SELECT * FROM service_orders WHERE id = ?')) {
                return state.serviceOrders.find((o) => o.id === args[0]) || null;
              }
              if (sql.startsWith("SELECT email, naam FROM users WHERE customer_id = ? AND role = 'eigenaar'")) {
                return state.users.find((u) => u.customer_id === args[0] && u.role === 'eigenaar') || null;
              }
              if (sql.startsWith('SELECT id FROM invoices WHERE payment_id = ?')) {
                const inv = state.invoices.find((i) => i.payment_id === args[0]);
                return inv ? { id: inv.id } : null;
              }
              if (sql.startsWith('UPDATE counters SET n = n + 1 WHERE name = ?')) {
                const name = args[0];
                state.counters[name] = (state.counters[name] || 0) + 1;
                return { n: state.counters[name] };
              }
              throw new Error(`makeDb: geen .first() canned voor: ${sql}`);
            },
            async run() {
              if (sql.startsWith('UPDATE subscriptions SET bedrag_cent = ?, betaling = ?')) {
                const [bedrag, betaling, id] = args;
                const s = state.subscriptions.find((row) => row.id === id);
                if (s) { s.bedrag_cent = bedrag; s.betaling = betaling; s.status = 'pending_payment'; }
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith('INSERT INTO subscriptions')) {
                const [
                  id, customerId, orderId, productKey, tier, bedragCent, betaling, status, mollieCustomerId, createdAt,
                ] = args;
                state.subscriptions.push({
                  id, customer_id: customerId, order_id: orderId, product_key: productKey, tier,
                  bedrag_cent: bedragCent, betaling, status, mollie_customer_id: mollieCustomerId, created_at: createdAt,
                });
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('INSERT INTO payments')) {
                const [
                  id, customerId, subscriptionId, orderId, bedragCent, status, sequenceType, paidAt, createdAt,
                ] = args;
                state.payments.push({
                  id, customer_id: customerId, subscription_id: subscriptionId, order_id: orderId,
                  bedrag_cent: bedragCent, status, sequence_type: sequenceType, paid_at: paidAt, created_at: createdAt,
                });
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'active', next_payment_date = ? WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[1]);
                if (s) s.status = 'active';
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'completed' WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[0]);
                if (s) s.status = 'completed';
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'active' WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[0]);
                if (s) s.status = 'active';
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith('UPDATE service_orders SET status = ?, submitted_at = ? WHERE id = ?')) {
                const o = state.serviceOrders.find((row) => row.id === args[2]);
                if (o) o.status = args[0];
                return { meta: { changes: o ? 1 : 0 } };
              }
              if (sql.startsWith('INSERT OR IGNORE INTO counters')) {
                const [name] = args;
                if (!(name in state.counters)) state.counters[name] = 0;
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('INSERT INTO invoices')) {
                state.invoices.push({ id: args[0], payment_id: args[8] });
                return { meta: { changes: 1 } };
              }
              throw new Error(`makeDb: geen .run() canned voor: ${sql}`);
            },
            async all() {
              throw new Error(`makeDb: geen .all() canned voor: ${sql}`);
            },
          };
        },
      };
    },
  };
}

function makeRequest(orderId) {
  return { json: async () => ({ order_id: orderId }) };
}

const owner = {
  customer_id: 'cust_1', email: 'klant@example.nl', naam: 'Jan Klant', role: 'eigenaar', created_at: 0,
};
const funnelOrder = {
  id: 'ord_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept',
};
const user = {
  role: 'eigenaar', customer_id: 'cust_1', naam: 'Jan Klant', email: 'klant@example.nl',
};

describe('handleCheckoutStart — TEST-MODUS (PAYMENTS_BYPASS)', () => {
  it('met flag aan: concept funnel-order wordt zonder Mollie doorgezet — checkoutUrl, geen fetch, subscription active, payments paid, activateOrder aangeroepen', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    expect(tier).toBeTruthy();
    const { totaalInclCent } = berekenEersteBetaling(tier);

    const db = makeDb({ serviceOrders: [funnelOrder], users: [owner] });
    const env = { PORTAL_DB: db, PAYMENTS_BYPASS: '1' }; // GEEN MOLLIE_API_KEY
    globalThis.fetch = throwingFetch();

    const res = await handleCheckoutStart(makeRequest('ord_1'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checkoutUrl).toBe('/portal/onboarding?order=ord_1');

    // Subscription: maandelijkse tier -> active (eerste betaling van de subscription).
    expect(db.state.subscriptions).toHaveLength(1);
    expect(db.state.subscriptions[0].status).toBe('active');

    // Payments-rij markeert de betaling meteen als voldaan, geen webhook nodig.
    expect(db.state.payments).toHaveLength(1);
    expect(db.state.payments[0].status).toBe('paid');
    expect(db.state.payments[0].bedrag_cent).toBe(totaalInclCent);
    expect(db.state.payments[0].id.startsWith('test_')).toBe(true);

    // Order geactiveerd via de bestaande onboarding-flow.
    expect(activateOrderMock).toHaveBeenCalledTimes(1);
    expect(db.state.serviceOrders[0].status).toBe('ingediend');

    // Bevestigingsmail + CRM-deal liepen ook mee (hergebruikte onPaid-keten).
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(dealWonVoorOrderMock).toHaveBeenCalledTimes(1);
  });

  it('zonder flag: handleCheckoutStart blijft ongewijzigd (503 zonder MOLLIE_API_KEY, geen test-modus-pad geraakt)', async () => {
    const db = makeDb({ serviceOrders: [funnelOrder], users: [owner] });
    const env = { PORTAL_DB: db }; // geen PAYMENTS_BYPASS, geen MOLLIE_API_KEY
    globalThis.fetch = throwingFetch();

    const res = await handleCheckoutStart(makeRequest('ord_1'), env, user);

    expect(res.status).toBe(503);
    expect(db.state.subscriptions).toHaveLength(0);
    expect(db.state.payments).toHaveLength(0);
    expect(activateOrderMock).not.toHaveBeenCalled();
  });

  it('vreemde order (niet gevonden / andere klant): 404', async () => {
    const db = makeDb({ serviceOrders: [funnelOrder], users: [owner] });
    const env = { PORTAL_DB: db, PAYMENTS_BYPASS: '1' };
    globalThis.fetch = throwingFetch();

    const res = await handleCheckoutStart(makeRequest('ord_onbestaand'), env, user);

    expect(res.status).toBe(404);
    expect(db.state.subscriptions).toHaveLength(0);
    expect(activateOrderMock).not.toHaveBeenCalled();
  });

  it('order heeft al een actief abonnement: 409, geen dubbele afhandeling', async () => {
    const db = makeDb({
      serviceOrders: [funnelOrder],
      subscriptions: [{
        id: 'sub_bestaand', order_id: 'ord_1', customer_id: 'cust_1', status: 'active',
      }],
      users: [owner],
    });
    const env = { PORTAL_DB: db, PAYMENTS_BYPASS: '1' };
    globalThis.fetch = throwingFetch();

    const res = await handleCheckoutStart(makeRequest('ord_1'), env, user);

    expect(res.status).toBe(409);
    expect(db.state.payments).toHaveLength(0);
    expect(activateOrderMock).not.toHaveBeenCalled();
  });

  it('ongeldige/onbekende tier: 400, geen TypeError, geen payments-rij, geen onPaid', async () => {
    const bogusTierOrder = {
      id: 'ord_bogus', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'NietBestaandeTier', status: 'concept',
    };
    const db = makeDb({ serviceOrders: [bogusTierOrder], users: [owner] });
    const env = { PORTAL_DB: db, PAYMENTS_BYPASS: '1' };
    globalThis.fetch = throwingFetch();

    const res = await handleCheckoutStart(makeRequest('ord_bogus'), env, user);

    expect(res.status).toBe(400);
    expect(db.state.subscriptions).toHaveLength(0);
    expect(db.state.payments).toHaveLength(0);
    expect(activateOrderMock).not.toHaveBeenCalled();
    expect(dealWonVoorOrderMock).not.toHaveBeenCalled();
  });

  it('cross-order dubbel-abonnement: order A via test-modus actief, order B (zelfde klant/product/tier) daarna 409 — geen tweede subscription/activateOrder/deal', async () => {
    // Order A: geen bestaande subscriptions — gaat gewoon actief via test-modus.
    const orderA = {
      id: 'ord_a', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept',
    };
    const dbA = makeDb({ serviceOrders: [orderA], users: [owner] });
    const envA = { PORTAL_DB: dbA, PAYMENTS_BYPASS: '1' };
    globalThis.fetch = throwingFetch();

    const resA = await handleCheckoutStart(makeRequest('ord_a'), envA, user);
    expect(resA.status).toBe(200);
    expect(dbA.state.subscriptions).toHaveLength(1);
    expect(dbA.state.subscriptions[0].status).toBe('active');
    expect(activateOrderMock).toHaveBeenCalledTimes(1);
    expect(dealWonVoorOrderMock).toHaveBeenCalledTimes(1);

    activateOrderMock.mockClear();
    dealWonVoorOrderMock.mockClear();
    sendMailMock.mockClear();

    // Order B: andere order, zelfde klant/product/tier. De cross-order-query
    // (customer_id + product_key + tier, status pending_payment/active) moet
    // het active abonnement van order A vinden en 409'en, VOORDAT er iets voor
    // order B wordt aangemaakt.
    const orderB = {
      id: 'ord_b', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept',
    };
    // makeDb's cross-order-query-stub matcht op customer_id + product_key +
    // tier + status pending_payment/active — order A's active-rij (hierboven
    // in dbA aangemaakt) simuleren we hier als bestaande subscriptions-rij op
    // dbB, zodat de nieuwe cross-order-guard hem voor order B moet vinden.
    const dbB = makeDb({
      serviceOrders: [orderB],
      subscriptions: [{
        id: 'sub_a', order_id: 'ord_a', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'active',
      }],
      users: [owner],
    });
    const envB = { PORTAL_DB: dbB, PAYMENTS_BYPASS: '1' };
    globalThis.fetch = throwingFetch();

    const resB = await handleCheckoutStart(makeRequest('ord_b'), envB, user);

    expect(resB.status).toBe(409);
    // Geen tweede subscription voor order B aangemaakt.
    expect(dbB.state.subscriptions).toHaveLength(1);
    expect(dbB.state.subscriptions[0].order_id).toBe('ord_a');
    expect(dbB.state.payments).toHaveLength(0);
    expect(activateOrderMock).not.toHaveBeenCalled();
    expect(dealWonVoorOrderMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
