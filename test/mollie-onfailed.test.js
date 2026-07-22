// Punt A (eindreview #2, critical): onFailed() deed niets voor een abonnement
// dat nog op 'pending_payment' staat — de guard bovenaan sprong eruit voor
// alles wat niet 'active' was. Scenario: bezoeker klikt "Ja, ik start", landt
// in iDEAL, sluit het tabblad. De reconcile-cron ziet de betaling 20 minuten
// later als 'expired' en roept onFailed aan — die deed dan NIETS. Die dode
// subscriptions-rij (status 'pending_payment') blijft voor altijd
// 'pending_payment' en blokkeert drie deuren tegelijk, want alle drie filteren
// op status IN ('pending_payment','active'):
//   1. de checkout van díe order zelf (existingSub-guard, mollie.js)
//   2. elke andere order van dezelfde klant voor hetzelfde product (de
//      klant+product-guard, mollie.js)
//   3. het aanmaken van een nieuwe order via de funnel (voorstel-verify.js)
//
// De fix zet zo'n dode 'pending_payment'-rij op 'canceled' (een bestaande,
// vrije eindstatus uit migrations/0007_billing.sql) zodra de eerste betaling
// mislukt/verloopt/geannuleerd wordt — 'canceled' valt buiten alle drie de
// guards hierboven, dus de klant kan gewoon opnieuw beginnen.
//
// Dit raakt NOOIT de bestaande dunning voor een reeds actief abonnement: een
// klant die al betaalt en één maandtermijn mist, gaat naar 'past_due', niet
// naar 'canceled' — die tak is ongewijzigd en wordt hieronder als regressie
// meegetest.
//
// Getest via reconcilePayments() (de 20-minuten cron) — niet via een directe
// aanroep van de niet-geëxporteerde onFailed() — omdat de opdracht expliciet
// vraagt te controleren of de reconcile-cron dit pad daadwerkelijk bereikt
// voor een verlopen betaling. handleMollieWebhook loopt door dezelfde
// onFailed()-functie; deze test dekt dus ook het webhook-pad functioneel af.
import {
  describe, it, expect, afterEach,
} from 'vitest';
import { reconcilePayments } from '../src/lib/mollie.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function jsonRes(obj) {
  return { ok: true, status: 200, text: async () => JSON.stringify(obj) };
}

// Minimale D1-dubbel: payments + subscriptions als muteerbare state, users
// altijd leeg (geen eigenaar) zodat de dunning-mailtak vanzelf skipt zonder
// een Brevo-fetch te hoeven stubben.
function makeDb({ payments, subscriptions }) {
  const state = {
    payments: payments.map((p) => ({ ...p })),
    subscriptions: subscriptions.map((s) => ({ ...s })),
  };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              if (sql.startsWith("SELECT id, subscription_id, order_id FROM payments WHERE status IN ('open','pending')")) {
                return { results: state.payments.filter((p) => p.status === 'open' || p.status === 'pending') };
              }
              throw new Error(`makeDb: geen .all() canned voor: ${sql}`);
            },
            async first() {
              if (sql.startsWith('SELECT * FROM subscriptions WHERE id = ?')) {
                return state.subscriptions.find((s) => s.id === args[0]) || null;
              }
              if (sql.startsWith("SELECT email, naam FROM users WHERE customer_id = ? AND role = 'eigenaar'")) {
                return null; // geen eigenaar bekend -> dunning-mail skipt vanzelf
              }
              throw new Error(`makeDb: geen .first() canned voor: ${sql}`);
            },
            async run() {
              if (sql.startsWith('UPDATE payments SET status = ? WHERE id = ? AND status != ?')) {
                const [newStatus, id] = args;
                const p = state.payments.find((row) => row.id === id);
                if (!p || p.status === newStatus) return { meta: { changes: 0 } };
                p.status = newStatus;
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'canceled' WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[0]);
                if (s) s.status = 'canceled';
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'past_due' WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[0]);
                if (s) s.status = 'past_due';
                return { meta: { changes: s ? 1 : 0 } };
              }
              throw new Error(`makeDb: geen .run() canned voor: ${sql}`);
            },
          };
        },
      };
    },
  };
}

describe('reconcilePayments -> onFailed — pending_payment sluit af i.p.v. dood te blijven hangen', () => {
  it('een verlopen EERSTE betaling zet het abonnement van pending_payment naar canceled (bevrijdt alle drie de guards)', async () => {
    const db = makeDb({
      payments: [{ id: 'tr_expired_1', status: 'open', subscription_id: 'sub_1', order_id: 'ord_1', created_at: 0 }],
      subscriptions: [{
        id: 'sub_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'pending_payment',
      }],
    });
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/payments/tr_expired_1')) return jsonRes({ status: 'expired' });
      throw new Error(`onverwachte fetch: ${url}`);
    };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await reconcilePayments(env);

    expect(db.state.subscriptions[0].status).toBe('canceled');
    expect(db.state.payments[0].status).toBe('expired');
  });

  it('regressie: een gemiste maandtermijn op een reeds actief abonnement gaat nog steeds naar past_due, NOOIT canceled', async () => {
    const db = makeDb({
      payments: [{ id: 'tr_failed_1', status: 'open', subscription_id: 'sub_2', order_id: null, created_at: 0 }],
      subscriptions: [{
        id: 'sub_2', customer_id: 'cust_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'active',
      }],
    });
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/payments/tr_failed_1')) return jsonRes({ status: 'failed' });
      throw new Error(`onverwachte fetch: ${url}`);
    };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await reconcilePayments(env);

    expect(db.state.subscriptions[0].status).toBe('past_due');
    expect(db.state.subscriptions[0].status).not.toBe('canceled');
  });

  it('regressie: een abonnement zonder subscription_id (geen sub-koppeling) raakt niets aan en gooit niet', async () => {
    const db = makeDb({
      payments: [{ id: 'tr_no_sub', status: 'open', subscription_id: null, order_id: null, created_at: 0 }],
      subscriptions: [],
    });
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/payments/tr_no_sub')) return jsonRes({ status: 'expired' });
      throw new Error(`onverwachte fetch: ${url}`);
    };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await expect(reconcilePayments(env)).resolves.not.toThrow();
    expect(db.state.payments[0].status).toBe('expired');
  });
});
