// POST /api/portal/onboarding — slaat wizard-antwoorden op (deep-merge in
// service_orders.intake_json) en her-provisioneert de order. Volgt exact het
// sessie-/eigenaarschapspatroon van test/onboarding-get.test.js (zelfde
// cookie → getSessionUser → 401, zelfde id=? AND customer_id=? → 404) plus
// de checkOrigin-guard die elke mutating /api/portal/* route al had
// (handlePortalApi, portal-routes.js).
import {
  describe, it, expect, afterEach,
} from 'vitest';
import { handlePortalApi } from '../src/lib/portal-routes.js';
import { createSession, SESSION_COOKIE } from '../src/lib/auth.js';

const SECRET = 'test-session-secret';
const SITE_ORIGIN = 'https://aanloopai.nl';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Minimale D1-stub met muteerbare state — combineert het sessie-lookup-
// patroon van onboarding-get.test.js (FROM users WHERE id = ?) met het
// service_orders + services state-model van activation.test.js
// (INSERT OR IGNORE INTO services / SELECT.../ UPDATE...) zodat één
// end-to-end POST door handlePortalApi → postOnboarding → activateOrder heen
// kan lopen. Een SQL-string zonder canned-antwoord gooit expliciet — dat vangt
// ook een implementatie die per ongeluk tier/product_key zou proberen te
// UPDATEn (zie de laatste test hieronder).
function makeDbStub({ users = [], order = null }) {
  const state = { order: order ? { ...order } : null, service: null };

  function respond(sql, args) {
    if (sql.includes('FROM users WHERE id = ?')) {
      const [id] = args;
      return { first: async () => users.find((u) => u.id === id) || null };
    }
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      const [id, customerId] = args;
      return {
        first: async () => (state.order && state.order.id === id && state.order.customer_id === customerId
          ? { ...state.order } : null),
      };
    }
    if (sql.startsWith('UPDATE service_orders SET intake_json = ?')) {
      return {
        run: async () => {
          const [intakeJson, id] = args;
          if (state.order && state.order.id === id) state.order.intake_json = intakeJson;
          return { meta: { changes: state.order ? 1 : 0 } };
        },
      };
    }
    if (sql.startsWith('INSERT OR IGNORE INTO services')) {
      return {
        run: async () => {
          const orderId = args[9];
          if (!state.service) state.service = { id: args[0], order_id: orderId, provisioning_json: null };
          return { meta: { changes: 1 } };
        },
      };
    }
    if (sql.startsWith('SELECT id, provisioning_json FROM services WHERE order_id')) {
      const [orderId] = args;
      return {
        first: async () => (state.service && state.service.order_id === orderId
          ? { id: state.service.id, provisioning_json: state.service.provisioning_json } : null),
      };
    }
    if (sql.startsWith('UPDATE services SET provisioning_json')) {
      return {
        run: async () => {
          const [json, svcId] = args;
          if (state.service && state.service.id === svcId) state.service.provisioning_json = json;
          return { meta: { changes: 1 } };
        },
      };
    }
    if (sql.startsWith("UPDATE service_orders SET status = 'actief'")) {
      return {
        run: async () => {
          const [id] = args;
          if (state.order && state.order.id === id) state.order.status = 'actief';
          return { meta: { changes: 1 } };
        },
      };
    }
    if (sql.startsWith("UPDATE service_orders SET status = 'in_uitvoering'")) {
      return {
        run: async () => {
          const [id] = args;
          if (state.order && state.order.id === id && !['in_uitvoering', 'actief'].includes(state.order.status)) {
            state.order.status = 'in_uitvoering';
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
      };
    }
    throw new Error(`makeDbStub: geen canned-antwoord voor SQL: ${sql}`);
  }

  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          const r = respond(sql, args);
          return {
            first: r.first || (async () => { throw new Error(`geen .first() voor: ${sql}`); }),
            all: r.all || (async () => { throw new Error(`geen .all() voor: ${sql}`); }),
            run: r.run || (async () => { throw new Error(`geen .run() voor: ${sql}`); }),
          };
        },
      };
    },
  };
}

function makeKvStub(store = {}) {
  return {
    async get(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  };
}

// Stubt de twee ElevenLabs-aanroepen die provisionAgent doet (KB-doc + agent)
// — zelfde twee endpoints als activation.test.js's makeFetchStub.
function jsonRes(obj) {
  return { ok: true, text: async () => JSON.stringify(obj) };
}
function makeFetchStub() {
  return async (url) => {
    const u = String(url);
    if (u.includes('/convai/knowledge-base/text')) return jsonRes({ id: 'kb_1', name: 'kb' });
    if (u.includes('/convai/agents/create')) return jsonRes({ agent_id: 'agent_1' });
    throw new Error(`onverwachte fetch: ${u}`);
  };
}

async function makeRequest(path, { userId, method = 'POST', body, origin = SITE_ORIGIN } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (origin) headers.Origin = origin;
  if (userId) {
    const token = await createSession(userId, SECRET);
    headers.Cookie = `${SESSION_COOKIE}=${token}`;
  }
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(`${SITE_ORIGIN}${path}`, init);
}

const USERS = [{ id: 'usr_1', customer_id: 'cus_1', email: 'a@test.nl', naam: 'A', role: 'eigenaar' }];

describe('POST /api/portal/onboarding', () => {
  // Task 7 (correctness-fix): dit MOET een ECHTE funnel-order zijn
  // (voorstel_id gezet) — vóór de fix bevatte activation.js een kortsluiting
  // die zo'n order voor eeuwig op wacht_op_klant liet staan, zelfs nadat deze
  // POST de intake volledig had gemaakt en provision() 'klaar' teruggaf. Dit
  // is de kern van Plak C: postOnboarding (portal-routes.js) roept
  // activateOrder() aan zonder {manual:true} — als de order hier niet op
  // actief belandt, werkt de hele self-serve funnel niet.
  it('funnel-order (voorstel_id gezet): vult de laatste ontbrekende verplichte velden in → activateOrder levert actief ZONDER manual, deep-merge bewaart eerdere stappen', async () => {
    const bijnaCompleet = {
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
      bereikbaarheid: { huidig_nummer: '+31 6 123', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
      afhandeling: { taken: ['Afspraken inplannen'] },
      integraties: { agenda: 'Geen / weet ik nog niet' },
      // kennis.toon ontbreekt nog — dit is het laatste verplichte veld.
    };
    const order = {
      id: 'ord_1', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter',
      intake_json: JSON.stringify(bijnaCompleet), status: 'ingediend', voorstel_id: 'vst_1',
    };
    const db = makeDbStub({ users: USERS, order });
    globalThis.fetch = makeFetchStub();
    const env = {
      PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub(), ELEVENLABS_API_KEY: 'test_key',
    };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      userId: 'usr_1',
      body: { order_id: 'ord_1', answers: { kennis: { toon: 'Zakelijk en warm' } } },
    }), env);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, actief: true });

    // Deep-merge bewezen: eerdere stappen blijven volledig intact, alleen
    // kennis (deze POST) is toegevoegd.
    const savedIntake = JSON.parse(db.state.order.intake_json);
    expect(savedIntake.bedrijf).toEqual(bijnaCompleet.bedrijf);
    expect(savedIntake.bereikbaarheid).toEqual(bijnaCompleet.bereikbaarheid);
    expect(savedIntake.afhandeling).toEqual(bijnaCompleet.afhandeling);
    expect(savedIntake.integraties).toEqual(bijnaCompleet.integraties);
    expect(savedIntake.kennis).toEqual({ toon: 'Zakelijk en warm' });
    expect(db.state.order.status).toBe('actief');
  });

  it('portal-order (voorstel_id null) gedraagt zich identiek: laatste veld erbij → actief', async () => {
    const bijnaCompleet = {
      bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
      bereikbaarheid: { huidig_nummer: '+31 6 123', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
      afhandeling: { taken: ['Afspraken inplannen'] },
      integraties: { agenda: 'Geen / weet ik nog niet' },
    };
    const order = {
      id: 'ord_1b', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter',
      intake_json: JSON.stringify(bijnaCompleet), status: 'ingediend', voorstel_id: null,
    };
    const db = makeDbStub({ users: USERS, order });
    globalThis.fetch = makeFetchStub();
    const env = {
      PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub(), ELEVENLABS_API_KEY: 'test_key',
    };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      userId: 'usr_1',
      body: { order_id: 'ord_1b', answers: { kennis: { toon: 'Zakelijk en warm' } } },
    }), env);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, actief: true });
    expect(db.state.order.status).toBe('actief');
  });

  it('vult slechts een deel in → nieuwe onboardingState (klaar:false), niet actief', async () => {
    const order = {
      id: 'ord_2', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter',
      intake_json: JSON.stringify({ bedrijf: { bedrijfsnaam: 'Testbedrijf' } }), status: 'ingediend', voorstel_id: null,
    };
    const db = makeDbStub({ users: USERS, order });
    globalThis.fetch = async (url) => { throw new Error(`mag niet worden aangeroepen bij onvolledige intake: ${url}`); };
    const env = {
      PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub(), ELEVENLABS_API_KEY: 'test_key',
    };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      userId: 'usr_1',
      body: { order_id: 'ord_2', answers: { bereikbaarheid: { huidig_nummer: '+31 6 1' } } },
    }), env);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.actief).toBeUndefined();
    expect(body.klaar).toBe(false);
    expect(body.missing.length).toBeGreaterThan(0);
    expect(body.schema).toBeTruthy();
    expect(db.state.order.status).not.toBe('actief');

    // Ook hier: het al aanwezige bedrijf-veld blijft staan naast het nieuwe.
    const savedIntake = JSON.parse(db.state.order.intake_json);
    expect(savedIntake.bedrijf).toEqual({ bedrijfsnaam: 'Testbedrijf' });
    expect(savedIntake.bereikbaarheid).toEqual({ huidig_nummer: '+31 6 1' });
  });

  it('onbekende order-id → 404', async () => {
    const db = makeDbStub({ users: USERS, order: null });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      userId: 'usr_1',
      body: { order_id: 'ord_onbekend', answers: {} },
    }), env);

    expect(res.status).toBe(404);
  });

  it('order van een ANDERE klant → 404, identiek aan onbekend', async () => {
    const order = {
      id: 'ord_3', customer_id: 'cus_ANDERS', product_key: 'emma-telefoon', tier: 'Starter',
      intake_json: '{}', status: 'ingediend', voorstel_id: null,
    };
    const db = makeDbStub({ users: USERS, order });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      userId: 'usr_1',
      body: { order_id: 'ord_3', answers: {} },
    }), env);

    expect(res.status).toBe(404);
  });

  it('geen sessie → 401', async () => {
    const db = makeDbStub({ users: USERS, order: null });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      body: { order_id: 'ord_1', answers: {} },
    }), env);

    expect(res.status).toBe(401);
  });

  it('answers kunnen tier/product_key NIET wijzigen — een gemanipuleerde answers.tier laat de order-tier ongewijzigd', async () => {
    const order = {
      id: 'ord_5', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter',
      intake_json: JSON.stringify({ bedrijf: { bedrijfsnaam: 'Testbedrijf' } }), status: 'ingediend', voorstel_id: null,
    };
    const db = makeDbStub({ users: USERS, order });
    globalThis.fetch = async (url) => { throw new Error(`mag niet worden aangeroepen: ${url}`); };
    const env = {
      PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub(), ELEVENLABS_API_KEY: 'test_key',
    };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      userId: 'usr_1',
      body: {
        order_id: 'ord_5',
        answers: { tier: 'Enterprise', product_key: 'emma', bereikbaarheid: { huidig_nummer: '+31 6 1' } },
      },
    }), env);

    expect(res.status).toBe(200);
    // De order-kolommen zelf zijn nooit aangeraakt (er is geen canned-antwoord
    // voor een UPDATE die tier/product_key wijzigt — dat zou de db-stub al
    // laten falen), en blijven dus letterlijk wat ze waren.
    expect(db.state.order.tier).toBe('Starter');
    expect(db.state.order.product_key).toBe('emma-telefoon');

    // De vervuilde platte waarden zijn niet eens in intake_json beland —
    // mergeIntakeAnswers slaat niet-object-antwoorden gewoon over.
    const savedIntake = JSON.parse(db.state.order.intake_json);
    expect(savedIntake.tier).toBeUndefined();
    expect(savedIntake.product_key).toBeUndefined();
    expect(savedIntake.bereikbaarheid).toEqual({ huidig_nummer: '+31 6 1' });
  });

  it('POST zonder Origin-header → 403, session/DB nooit geraakt', async () => {
    const db = makeDbStub({ users: USERS, order: null });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding', {
      userId: 'usr_1',
      body: { order_id: 'ord_1', answers: {} },
      origin: null,
    }), env);

    expect(res.status).toBe(403);
  });
});
