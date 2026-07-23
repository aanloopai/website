// Legt de derde provisioning-uitkomst vast (spec §5, "wacht_op_klant"): een
// order die uit de self-serve funnel komt (service_orders.voorstel_id gezet)
// heeft alleen de ondiepe wizard-intake. Een geslaagde ElevenLabs-provisioning
// mag zo'n order NOOIT op 'actief' zetten — de diepe intake ontbreekt nog.
//
// Task 3 (2026-07-23): het interim-seintje dat hier ooit bij hoorde (zie git-
// historie van activation.js voor de volledige uitleg) is verwijderd —
// wacht_op_klant alert NOOIT meer. De klant wordt voortaan via
// /portal/onboarding + de nudge-cron benaderd (spec plak C, Task 8/13), niet
// via een staff-alert. Een order zonder voorstel_id (het bestaande
// portaalpad) moet zich exact blijven gedragen als vandaag: succesvolle
// provisioning -> 'actief', geen enkele wijziging aan die tak.
import { describe, it, expect, afterEach } from 'vitest';
import { activateOrder } from '../src/lib/activation.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function jsonRes(obj) {
  return { ok: true, text: async () => JSON.stringify(obj) };
}

// Stubt de twee ElevenLabs-aanroepen die provisionAgent doet (KB-doc + agent).
// Telt ook aanroepen naar Brevo/Telegram (alertStaff) zodat een test kan
// bewijzen hoeveel keer (en wat) er is gealerteerd. alertBodies bevat de
// geparste request-body per Brevo-aanroep, zodat een test de tekst kan
// controleren (seintje-toon vs. storingstoon).
function makeFetchStub({ elevenlabsFails = false } = {}) {
  const alertCalls = [];
  const alertBodies = [];
  const fn = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.brevo.com')) {
      alertCalls.push(u);
      alertBodies.push(opts.body ? JSON.parse(opts.body) : null);
      return { ok: true, text: async () => '{}' };
    }
    if (u.includes('api.telegram.org')) {
      alertCalls.push(u);
      return { ok: true, text: async () => '{}' };
    }
    if (u.includes('/convai/knowledge-base/text')) {
      if (elevenlabsFails) return { ok: false, status: 500, text: async () => 'boom' };
      return jsonRes({ id: 'kb_1', name: 'kb' });
    }
    if (u.includes('/convai/agents/create')) {
      return jsonRes({ agent_id: 'agent_1' });
    }
    throw new Error(`onverwachte fetch: ${u}`);
  };
  fn.alertCalls = alertCalls;
  fn.alertBodies = alertBodies;
  return fn;
}

// In-memory D1-dubbel voor activation.js. `servicesSeed` laat een test een
// reeds-geprovisionede services-rij vooraf plaatsen (replay-scenario).
// `initialOrderStatus` volgt de ECHTE service_orders.status die op dat moment
// in D1 zou staan — bij een replay is dat 'in_uitvoering' (de vorige
// activatie heeft die kolom al gezet), niet het standaard 'ingediend' van een
// verse order. De 'in_uitvoering'-UPDATE is CAS: hij matcht alleen een rij
// (changes: 1) als de status nog NIET 'in_uitvoering' of 'actief' is — precies
// zoals de echte SQL in activation.js — zodat deze dubbel dezelfde
// fires-once-garantie test die de productiecode moet leveren.
function makeDb({ servicesSeed = null, initialOrderStatus = 'ingediend' } = {}) {
  const state = {
    services: servicesSeed ? [{ ...servicesSeed }] : [],
    orderStatusUpdates: [], // [{status}], elke ECHTE transitie (geen no-op replay)
    orderStatus: initialOrderStatus,
  };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT OR IGNORE INTO services')) {
                const orderId = args[9];
                if (!state.services.some((s) => s.order_id === orderId)) {
                  state.services.push({
                    id: args[0], customer_id: args[1], product_key: args[2], naam: args[3],
                    tier: args[4], status: args[5], config_json: args[6], order_id: orderId,
                    provisioning_json: null,
                  });
                }
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('UPDATE services SET provisioning_json')) {
                const [provisioningJson, svcId] = args;
                const svc = state.services.find((s) => s.id === svcId);
                if (svc) svc.provisioning_json = provisioningJson;
                return { meta: { changes: svc ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE service_orders SET status = 'actief'")) {
                state.orderStatusUpdates.push({ status: 'actief', orderId: args[0] });
                state.orderStatus = 'actief';
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE service_orders SET status = 'in_uitvoering'")) {
                if (state.orderStatus === 'in_uitvoering' || state.orderStatus === 'actief') {
                  return { meta: { changes: 0 } }; // CAS-miss: al in die toestand — no-op replay
                }
                state.orderStatus = 'in_uitvoering';
                state.orderStatusUpdates.push({ status: 'in_uitvoering', orderId: args[0] });
                return { meta: { changes: 1 } };
              }
              throw new Error(`makeDb: geen .run() canned voor: ${sql}`);
            },
            async first() {
              if (sql.startsWith('SELECT id, provisioning_json FROM services WHERE order_id')) {
                const svc = state.services.find((s) => s.order_id === args[0]);
                return svc ? { id: svc.id, provisioning_json: svc.provisioning_json } : null;
              }
              throw new Error(`makeDb: geen .first() canned voor: ${sql}`);
            },
          };
        },
      };
    },
  };
}

// Sinds de provisioner-registry (voice.js) beoordeelt of de intake compleet
// genoeg is om live te gaan (missingForLive tegen het emma-telefoon-schema,
// src/data/intake-schemas.ts) moet de intake hier alle verplichte velden
// bevatten — anders levert de provisioner ZELF al 'wacht_op_klant' op (ontbrekende
// gegevens) vóórdat de funnel/manual-logica in activation.js aan de beurt komt.
// Deze tests dekken die funnel/manual-logica, niet de veldcompleetheid, dus de
// intake hieronder is bewust volledig.
const COMPLETE_INTAKE = JSON.stringify({
  bedrijf: { bedrijfsnaam: 'Test BV', branche: 'tandartspraktijk' },
  bereikbaarheid: {
    huidig_nummer: '010-1234567', openingstijden: 'Ma-Vr 09:00-17:00', buiten_tijden: 'Voicemail buiten openingstijden',
  },
  afhandeling: { taken: ['Een bericht aannemen'] },
  kennis: { toon: 'Zakelijk en warm' },
});

function funnelOrder(overrides = {}) {
  return {
    id: 'ord_funnel_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter',
    status: 'ingediend', intake_json: COMPLETE_INTAKE, voorstel_id: 'vst_1', ...overrides,
  };
}
function portalOrder(overrides = {}) {
  return {
    id: 'ord_portal_1', customer_id: 'cust_2', product_key: 'emma-telefoon', tier: 'Starter',
    status: 'ingediend', intake_json: COMPLETE_INTAKE, voorstel_id: null, ...overrides,
  };
}

describe('activateOrder — derde uitkomst wacht_op_klant voor funnel-orders', () => {
  it('funnel-order (voorstel_id gezet): geslaagde provisioning zet NOOIT op actief, wel op in_uitvoering, en alert NIET (Task 3: interim-seintje verwijderd)', async () => {
    const db = makeDb();
    const fetchStub = makeFetchStub();
    globalThis.fetch = fetchStub;
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key', BREVO_API_KEY: 'brevo_key' };

    const order = funnelOrder();
    const result = await activateOrder(env, order);

    expect(result.status).toBe('wacht_op_klant');
    expect(result.provisioned).toBe(true);
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: order.id }]);
    expect(db.state.orderStatusUpdates.some((u) => u.status === 'actief')).toBe(false);

    // Geen enkel seintje meer — noch storingsalert, noch het oude interim-seintje.
    expect(fetchStub.alertCalls).toEqual([]);
  });

  it('portal-order (voorstel_id null): geslaagde provisioning gedraagt zich exact als vandaag — actief, geen enkel seintje', async () => {
    const db = makeDb();
    const fetchStub = makeFetchStub();
    globalThis.fetch = fetchStub;
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key', BREVO_API_KEY: 'brevo_key' };

    const order = portalOrder();
    const result = await activateOrder(env, order);

    expect(result.status).toBe('actief');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'actief', orderId: order.id }]);
    expect(fetchStub.alertCalls).toEqual([]);
  });

  it('replay via dezelfde D1-rij (webhook gevolgd door reconcile-cron): geen tweede transitie, en er gaat sowieso geen seintje uit', async () => {
    const db = makeDb();
    const fetchStub = makeFetchStub();
    globalThis.fetch = fetchStub;
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key', BREVO_API_KEY: 'brevo_key' };

    const order = funnelOrder();
    const first = await activateOrder(env, order);
    expect(first.status).toBe('wacht_op_klant');
    expect(fetchStub.alertCalls).toEqual([]);

    // Zelfde db (dus dezelfde D1-rij, nu al 'in_uitvoering') — simuleert de
    // 15-minuten reconcile-cron of een tweede webhook-delivery die dezelfde
    // order opnieuw activeert. ElevenLabs wordt hier niet opnieuw geraakt
    // (provisioning_json staat al op geslaagd), dus dezelfde fetchStub volstaat.
    const second = await activateOrder(env, order);
    expect(second.status).toBe('wacht_op_klant');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: order.id }]); // geen tweede transitie
    expect(fetchStub.alertCalls).toEqual([]); // nog steeds geen seintje
  });

  it('replay (al eerder succesvol geprovisioned én al in_uitvoering): funnel-order blijft wacht_op_klant, geen tweede provisioning-call, geen seintje', async () => {
    const db = makeDb({
      initialOrderStatus: 'in_uitvoering', // de eerdere activatie zette dit al
      servicesSeed: {
        id: 'svc_1', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_funnel_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'agent_1' }),
      },
    });
    const fetchStub = makeFetchStub();
    fetchStub.alertCalls = []; // her-init niet nodig, maar expliciet voor leesbaarheid
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('api.brevo.com') || u.includes('api.telegram.org')) {
        fetchStub.alertCalls.push(u);
        return { ok: true, text: async () => '{}' };
      }
      throw new Error(`mag niet worden aangeroepen bij een replay: ${u}`);
    };

    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key', BREVO_API_KEY: 'brevo_key' };
    const result = await activateOrder(env, funnelOrder());

    expect(result.status).toBe('wacht_op_klant');
    expect(db.state.orderStatusUpdates).toEqual([]); // geen enkele transitie — was al in_uitvoering
    expect(fetchStub.alertCalls).toEqual([]);
  });

  it('replay (al eerder succesvol geprovisioned): portal-order gedraagt zich exact als vandaag — actief, geen tweede provisioning-call', async () => {
    const db = makeDb({
      initialOrderStatus: 'ingediend',
      servicesSeed: {
        id: 'svc_2', customer_id: 'cust_2', product_key: 'emma-telefoon', order_id: 'ord_portal_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'agent_2' }),
      },
    });
    globalThis.fetch = async (url) => { throw new Error(`mag niet worden aangeroepen bij een replay: ${url}`); };

    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const result = await activateOrder(env, portalOrder());

    expect(result.status).toBe('actief');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'actief', orderId: 'ord_portal_1' }]);
  });

  // ── Punt D (eindreview #2): manual:true MOET een funnel-order kunnen
  // afsluiten. Vóór deze fix negeerde de wacht_op_klant-guard `manual`
  // volledig — daardoor kon een mens de wachttoestand nooit doorbreken, ook
  // niet nadat hij de diepe intake zelf handmatig had afgerond (openingstijden,
  // doorschakelnummer, nummer koppelen — buiten dit systeem om). De
  // automatische paden (webhook, cron — geen manual:true) moeten de
  // wachttoestand wél blijven respecteren; dat dekken de tests hierboven
  // (zonder { manual: true }) al af en blijven ongewijzigd.
  it('een handmatige admin-klik (manual:true) op een AL GEPROVISIONEDE funnel-order sluit de order alsnog af op actief', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_3', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_funnel_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'agent_3' }),
      },
    });
    globalThis.fetch = async (url) => { throw new Error(`mag geen ElevenLabs-call doen bij een reeds geslaagde provisioning: ${url}`); };

    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const result = await activateOrder(env, funnelOrder(), { manual: true });

    expect(result.status).toBe('actief');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'actief', orderId: 'ord_funnel_1' }]);
  });

  it('een handmatige admin-klik (manual:true) op een funnel-order die NU voor het eerst succesvol provisiont, sluit ook af op actief', async () => {
    const db = makeDb();
    globalThis.fetch = makeFetchStub();

    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const result = await activateOrder(env, funnelOrder(), { manual: true });

    expect(result.status).toBe('actief');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'actief', orderId: 'ord_funnel_1' }]);
  });
});
