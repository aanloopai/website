// Demo-intake (2026-09-19): na een demo-aanvraag één mail ("geen login
// nodig" + persoonlijke link), vijf vragen op /demo/intake/, antwoorden in
// lead_intake, Telegram/staffmail/bevestiging, admin-knop om de mail (opnieuw)
// te sturen. Aanleiding: lead_mu898y0gtymris "kan nergens inloggen".
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import {
  DEMO_INTAKE_SCHEMA, INVITE_SUBJECT, INTAKE_PATH, TOKEN_TTL_MS,
  signIntakeToken, verifyIntakeToken, intakeLink, validateIntakeAnswers,
  summarizeIntake, formatIntakeTelegram, buildIntakeInviteHtml,
  sendIntakeInvite, handleDemoIntake, _resetSchemaFlagForTests,
} from '../src/lib/demo-intake.js';
import { handleAdminApi } from '../src/lib/admin-routes.js';
import { createSession, SESSION_COOKIE } from '../src/lib/auth.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE = 'https://aanloopai.nl';
const SECRET = 'test-secret';
const LEAD = { id: 'lead_mu898y0gtymris', email: 'info@example.nl', naam: 'Anass Youssfi', bedrijf: 'nexxt sites', telefoon: '06 00000000', form_type: 'demo', status: 'nieuw' };

function validAnswers() {
  return {
    dienst: [DEMO_INTAKE_SCHEMA[0].options[0], DEMO_INTAKE_SCHEMA[0].options[4]],
    doel: 'Minder gemiste telefoontjes',
    huidig: 'Ik neem zelf op als ik kan',
    vorm: DEMO_INTAKE_SCHEMA[3].options[0],
    moment: 'dinsdagochtend',
  };
}

// Fake D1 die precies de SQL-vormen van demo-intake.js + listLeads herkent.
function makeDb({ lead = LEAD, intake = null } = {}) {
  const state = { lead: { ...lead }, intake: intake ? { ...intake } : null, ddl: [] };
  return {
    state,
    prepare(sql) {
      const stmt = {
        args: [],
        bind(...a) { stmt.args = a; return stmt; },
        async first() {
          if (sql.includes('FROM inbound_leads l LEFT JOIN lead_intake i') && sql.includes('WHERE l.id = ?')) {
            return stmt.args[0] === state.lead.id ? { ...state.lead, answered_at: state.intake?.answered_at || null } : null;
          }
          if (sql.includes('FROM inbound_leads WHERE id = ?')) return stmt.args[0] === state.lead.id ? { ...state.lead } : null;
          if (sql.includes('FROM users WHERE id = ?')) return { id: 'usr_s', customer_id: null, email: 'staff@example.com', naam: 'S', role: 'staff' };
          return null;
        },
        async run() {
          if (sql.startsWith('CREATE TABLE')) { state.ddl.push(sql); return { meta: { changes: 0 } }; }
          if (sql.includes('INSERT INTO lead_intake (lead_id, mail_at, mail_count)')) {
            const [leadId, mailAt] = stmt.args;
            state.intake = state.intake ? { ...state.intake, mail_at: mailAt, mail_count: state.intake.mail_count + 1 } : { lead_id: leadId, mail_at: mailAt, mail_count: 1 };
            return { meta: { changes: 1 } };
          }
          if (sql.includes('INSERT INTO lead_intake (lead_id, answered_at, answers_json)')) {
            const [leadId, at, json] = stmt.args;
            state.intake = { ...(state.intake || { lead_id: leadId, mail_count: 0 }), answered_at: at, answers_json: json };
            return { meta: { changes: 1 } };
          }
          if (sql.includes("UPDATE inbound_leads SET status = 'in_behandeling'")) {
            if (state.lead.status === 'nieuw') state.lead.status = 'in_behandeling';
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async all() {
          if (sql.includes('FROM inbound_leads l LEFT JOIN lead_intake i')) {
            return { results: [{ ...state.lead, intake_mail_at: state.intake?.mail_at || null, intake_mail_count: state.intake?.mail_count || 0, intake_answered_at: state.intake?.answered_at || null, intake_answers_json: state.intake?.answers_json || null }] };
          }
          return { results: [] };
        },
      };
      return stmt;
    },
  };
}

beforeEach(() => _resetSchemaFlagForTests());

// ── token ───────────────────────────────────────────────────────────────────
describe('intake-token', () => {
  it('rondreis: sign → verify geeft de lead-id terug', async () => {
    const t = await signIntakeToken('lead_x', SECRET);
    expect(await verifyIntakeToken(t, SECRET)).toEqual({ leadId: 'lead_x' });
  });

  it('weigert verkeerd secret, geknoei, verlopen en lege invoer', async () => {
    const t = await signIntakeToken('lead_x', SECRET, 1000);
    expect(await verifyIntakeToken(t, 'ander-secret', 2000)).toBeNull();
    expect(await verifyIntakeToken(t.slice(0, -1) + (t.endsWith('0') ? '1' : '0'), SECRET, 2000)).toBeNull();
    expect(await verifyIntakeToken(t, SECRET, 1000 + TOKEN_TTL_MS + 1)).toBeNull();
    expect(await verifyIntakeToken('', SECRET)).toBeNull();
    expect(await verifyIntakeToken(t, '')).toBeNull();
    expect(await verifyIntakeToken('a.b.c', SECRET)).toBeNull();
  });

  it('link wijst naar /demo/intake/?t=… met url-encoded token', async () => {
    const t = await signIntakeToken('lead_x', SECRET);
    expect(intakeLink(t)).toBe(`${SITE}${INTAKE_PATH}?t=${encodeURIComponent(t)}`);
  });
});

// ── schema + validatie ──────────────────────────────────────────────────────
describe('validateIntakeAnswers', () => {
  it('accepteert een volledige set en laat onbekende sleutels vallen', () => {
    const r = validateIntakeAnswers({ ...validAnswers(), hacker: 'x' });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.answers).sort()).toEqual(['dienst', 'doel', 'huidig', 'moment', 'vorm']);
  });

  it('eist dienst, doel en vorm; huidig/moment zijn optioneel', () => {
    const base = validAnswers();
    expect(validateIntakeAnswers({ ...base, dienst: [] }).ok).toBe(false);
    expect(validateIntakeAnswers({ ...base, doel: '  ' }).ok).toBe(false);
    expect(validateIntakeAnswers({ ...base, vorm: '' }).ok).toBe(false);
    const r = validateIntakeAnswers({ dienst: base.dienst, doel: base.doel, vorm: base.vorm });
    expect(r.ok).toBe(true);
    expect(r.answers.huidig).toBeUndefined();
  });

  it('select/multiselect alleen uit de opties; enkele string bij multiselect wordt lijst; tekst afgekapt', () => {
    const base = validAnswers();
    expect(validateIntakeAnswers({ ...base, vorm: 'iets anders' }).ok).toBe(false);
    expect(validateIntakeAnswers({ ...base, dienst: ['nep'] }).ok).toBe(false);
    const single = validateIntakeAnswers({ ...base, dienst: DEMO_INTAKE_SCHEMA[0].options[1] });
    expect(single.answers.dienst).toEqual([DEMO_INTAKE_SCHEMA[0].options[1]]);
    const long = validateIntakeAnswers({ ...base, doel: 'x'.repeat(5000) });
    expect(long.answers.doel).toHaveLength(1500);
    expect(validateIntakeAnswers(null).ok).toBe(false);
  });

  it('samenvatting + Telegram noemen dienst (kort), doel en de admin-link', () => {
    const lines = summarizeIntake(validAnswers());
    expect(lines[0]).toMatch(/^Waar wilt u de demo over zien: Emma, Weet ik nog niet$/);
    const tg = formatIntakeTelegram(LEAD, validAnswers());
    expect(tg).toContain('✅ Demo-intake beantwoord — Anass Youssfi <info@example.nl>');
    expect(tg).toContain('Bedrijf: nexxt sites');
    expect(tg).toContain('Minder gemiste telefoontjes');
    expect(tg).toContain(`(lead ${LEAD.id})`);
  });
});

// ── uitnodigingsmail ────────────────────────────────────────────────────────
describe('sendIntakeInvite', () => {
  it('mailt "geen login nodig" + link en registreert mail_at/mail_count (2× = count 2)', async () => {
    const db = makeDb();
    const sent = [];
    const mailFn = async (env, to, naam, subject, html) => sent.push({ to, naam, subject, html });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET };
    const link = await sendIntakeInvite(env, LEAD, mailFn);
    await sendIntakeInvite(env, LEAD, mailFn);
    expect(sent).toHaveLength(2);
    expect(sent[0].to).toBe(LEAD.email);
    expect(sent[0].subject).toBe(INVITE_SUBJECT);
    expect(sent[0].html).toContain('Hallo Anass,');
    expect(sent[0].html).toContain('u hoeft nergens in te loggen en er is geen account of wachtwoord');
    expect(sent[0].html).toContain(link.replace(/&/g, '&amp;'));
    expect(link.startsWith(`${SITE}${INTAKE_PATH}?t=`)).toBe(true);
    expect(await verifyIntakeToken(new URL(link).searchParams.get('t'), SECRET)).toEqual({ leadId: LEAD.id });
    expect(db.state.intake.mail_count).toBe(2);
    expect(db.state.ddl.some((d) => d.includes('lead_intake'))).toBe(true);
  });

  it('gooit zonder secret en verstuurt dan niets', async () => {
    const sent = [];
    await expect(sendIntakeInvite({ PORTAL_DB: makeDb() }, LEAD, async () => sent.push(1))).rejects.toThrow(/PORTAL_SESSION_SECRET/);
    expect(sent).toHaveLength(0);
  });

  it('mail-html bevat het echte telefoonnummer van de site, geen verzonnen nummer', () => {
    const html = buildIntakeInviteHtml('Anass', 'https://x');
    expect(html).toContain('tel:+31624741597');
  });
});

// ── /api/demo-intake ────────────────────────────────────────────────────────
describe('handleDemoIntake', () => {
  const origFetch = globalThis.fetch;
  let tg;
  beforeEach(() => {
    tg = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      tg.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
      return { ok: true, status: 200, text: async () => '', json: async () => ({ ok: true }) };
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  function env(db) { return { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, TELEGRAM_BOT_TOKEN: 'tg', TELEGRAM_CHAT_ID: '1', BREVO_API_KEY: 'k' }; }

  it('GET met geldig token → voornaam, bedrijf, schema, answered=false', async () => {
    const db = makeDb();
    const t = await signIntakeToken(LEAD.id, SECRET);
    const res = await handleDemoIntake(new Request(`${SITE}/api/demo-intake?t=${encodeURIComponent(t)}`), env(db));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.lead).toEqual({ voornaam: 'Anass', bedrijf: 'nexxt sites', answered: false });
    expect(j.schema.map((q) => q.name)).toEqual(['dienst', 'doel', 'huidig', 'vorm', 'moment']);
  });

  it('GET met ongeldig token → 400, onbekende lead → 404, zonder secret → 503', async () => {
    expect((await handleDemoIntake(new Request(`${SITE}/api/demo-intake?t=nep`), env(makeDb()))).status).toBe(400);
    const t = await signIntakeToken('lead_onbekend', SECRET);
    expect((await handleDemoIntake(new Request(`${SITE}/api/demo-intake?t=${t}`), env(makeDb()))).status).toBe(404);
    expect((await handleDemoIntake(new Request(`${SITE}/api/demo-intake?t=${t}`), { PORTAL_DB: makeDb() })).status).toBe(503);
  });

  it('POST bewaart antwoorden, zet lead op in_behandeling, meldt op Telegram + staff, bevestigt aan klant', async () => {
    const db = makeDb();
    const t = await signIntakeToken(LEAD.id, SECRET);
    const sent = [];
    const mailFn = async (e, to, naam, subject, html) => sent.push({ to, subject, html });
    const req = new Request(`${SITE}/api/demo-intake`, {
      method: 'POST', headers: { 'content-type': 'application/json', Origin: SITE },
      body: JSON.stringify({ t, answers: validAnswers() }),
    });
    const res = await handleDemoIntake(req, env(db), { sendMailFn: mailFn });
    expect(res.status).toBe(200);
    expect(JSON.parse(db.state.intake.answers_json).doel).toBe('Minder gemiste telefoontjes');
    expect(db.state.intake.answered_at).toBeGreaterThan(0);
    expect(db.state.lead.status).toBe('in_behandeling');
    const tgCall = tg.find((c) => c.url.includes('api.telegram.org'));
    expect(tgCall?.body?.text).toContain('✅ Demo-intake beantwoord');
    const staff = tg.find((c) => c.url.includes('brevo') && c.body?.to?.[0]?.email === 'hello@aanloopai.nl');
    expect(staff?.body?.subject).toContain('Demo-intake beantwoord');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(LEAD.email);
    expect(sent[0].html).toContain('/demo-inplannen/');
    // tweede GET zegt answered=true (pagina toont "bedankt", geen formulier)
    const again = await (await handleDemoIntake(new Request(`${SITE}/api/demo-intake?t=${encodeURIComponent(t)}`), env(db))).json();
    expect(again.lead.answered).toBe(true);
  });

  it('POST: onvolledige antwoorden → 400 en niets bewaard; vreemde Origin → 403; verlopen token → 400', async () => {
    const db = makeDb();
    const t = await signIntakeToken(LEAD.id, SECRET);
    const bad = await handleDemoIntake(new Request(`${SITE}/api/demo-intake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, answers: { doel: 'x' } }) }), env(db));
    expect(bad.status).toBe(400);
    expect(db.state.intake).toBeNull();
    const cross = await handleDemoIntake(new Request(`${SITE}/api/demo-intake`, { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify({ t, answers: validAnswers() }) }), env(db));
    expect(cross.status).toBe(403);
    const old = await signIntakeToken(LEAD.id, SECRET, Date.now() - TOKEN_TTL_MS - 1000);
    const exp = await handleDemoIntake(new Request(`${SITE}/api/demo-intake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: old, answers: validAnswers() }) }), env(db));
    expect(exp.status).toBe(400);
  });
});

// ── admin ───────────────────────────────────────────────────────────────────
describe('admin: lead-intake-invite + listLeads', () => {
  const origFetch = globalThis.fetch;
  let mails;
  beforeEach(() => {
    mails = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      mails.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
      return { ok: true, status: 200, text: async () => '' };
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  async function staffReq(path, init = {}) {
    const token = await createSession('usr_s', SECRET);
    return new Request(`${SITE}${path}`, { ...init, headers: { 'content-type': 'application/json', Origin: SITE, Cookie: `${SESSION_COOKIE}=${token}`, ...(init.headers || {}) } });
  }

  it('POST /api/admin/lead-intake-invite mailt de lead en registreert de uitnodiging', async () => {
    const db = makeDb();
    const res = await handleAdminApi(await staffReq('/api/admin/lead-intake-invite', { method: 'POST', body: JSON.stringify({ id: LEAD.id }) }),
      { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, BREVO_API_KEY: 'k' });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.mailed).toBe(true);
    const mail = mails.find((m) => m.url.includes('brevo'));
    expect(mail.body.to[0].email).toBe(LEAD.email);
    expect(mail.body.subject).toBe(INVITE_SUBJECT);
    expect(mail.body.htmlContent).toContain('geen account of wachtwoord');
    expect(db.state.intake.mail_count).toBe(1);
  });

  it('onbekende lead → 404; zonder Brevo-key → 503 en geen registratie', async () => {
    const r404 = await handleAdminApi(await staffReq('/api/admin/lead-intake-invite', { method: 'POST', body: JSON.stringify({ id: 'lead_nope' }) }),
      { PORTAL_DB: makeDb(), PORTAL_SESSION_SECRET: SECRET, BREVO_API_KEY: 'k' });
    expect(r404.status).toBe(404);
    const db = makeDb();
    const r503 = await handleAdminApi(await staffReq('/api/admin/lead-intake-invite', { method: 'POST', body: JSON.stringify({ id: LEAD.id }) }),
      { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET });
    expect(r503.status).toBe(503);
    expect(db.state.intake).toBeNull();
  });

  it('GET /api/admin/leads levert intake-velden (mail_at/count, answered_at, answers als object)', async () => {
    const db = makeDb({ intake: { lead_id: LEAD.id, mail_at: 111, mail_count: 2, answered_at: 222, answers_json: JSON.stringify(validAnswers()) } });
    const res = await handleAdminApi(await staffReq('/api/admin/leads'), { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET });
    const j = await res.json();
    expect(j.leads[0]).toMatchObject({ id: LEAD.id, intake_mail_at: 111, intake_mail_count: 2, intake_answered_at: 222 });
    expect(j.leads[0].intake_answers.doel).toBe('Minder gemiste telefoontjes');
    expect(j.leads[0].intake_answers_json).toBeUndefined();
  });
});

// ── worker.js-bedrading (bron-guard, zoals telegram-notify.test.js) ─────────
describe('worker.js bedrading', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'src', 'worker.js'), 'utf8');

  it('routeert /api/demo-intake naar handleDemoIntake met de klantmail-functie', () => {
    expect(worker).toMatch(/import \{ handleDemoIntake, sendIntakeInvite \} from '\.\/lib\/demo-intake\.js'/);
    expect(worker).toContain("url.pathname === '/api/demo-intake'");
    expect(worker).toContain('handleDemoIntake(request, env, { sendMailFn: sendCustomerMail })');
  });

  it('demo-aanvraag in /api/submit stuurt de intake-uitnodiging i.p.v. de generieke autoresponder', () => {
    const submit = worker.slice(worker.indexOf('async function handleSubmit'), worker.indexOf('// GET /api/consent/confirm'));
    const invite = submit.indexOf("formType === 'demo' && leadId && env.PORTAL_SESSION_SECRET");
    const generic = submit.indexOf('let autoresponseHtml;');
    expect(invite).toBeGreaterThan(-1);
    expect(invite).toBeLessThan(generic);
    expect(submit).toContain('sendIntakeInvite(env, { id: leadId, email: userEmail, naam: fullName }, sendCustomerMail)');
    // pas ná de owner-notificatiemail (die blijft), en de lead wordt als verzonden gemarkeerd
    expect(submit.indexOf("'notification')")).toBeLessThan(invite);
    expect(submit.slice(invite)).toContain("markLeadMail(env, leadId, 'verzonden', null)");
  });
});
