// CRM core (F1) — activiteiten-tijdlijn, deals/pipeline, globale zoekfunctie
// en werkdag/feestdag-helpers. Zelfde (request, env) + jsonResponse/
// errorResponse-conventie als outreach.js; wired into src/lib/admin-routes.js
// als /api/admin/crm/* + /api/admin/search. Staff-guard + CSRF/origin guard
// draaien al in handleAdminApi voordat een van deze handlers uitgevoerd wordt.
import { jsonResponse, errorResponse } from './google-auth.js';
import { getSessionUser } from './auth.js';

function today() { return new Date().toISOString().slice(0, 10); }

// ── werkdag / feestdag-helpers ──────────────────────────────────────────────
// Statische lijst i.p.v. berekend: Pasen/Hemelvaart/Pinksteren zijn beweegbare
// feestdagen (afhankelijk van de paasformule). Jaarlijks bijwerken — 2028+
// ontbreekt bewust, voeg toe zodra nodig.
const NL_FEESTDAGEN = new Set([
  // 2026
  '2026-01-01', // Nieuwjaarsdag
  '2026-04-03', // Goede Vrijdag
  '2026-04-05', // Eerste Paasdag
  '2026-04-06', // Tweede Paasdag
  '2026-04-27', // Koningsdag
  '2026-05-05', // Bevrijdingsdag
  '2026-05-14', // Hemelvaartsdag
  '2026-05-24', // Eerste Pinksterdag
  '2026-05-25', // Tweede Pinksterdag
  '2026-12-25', // Eerste Kerstdag
  '2026-12-26', // Tweede Kerstdag
  // 2027
  '2027-01-01', // Nieuwjaarsdag
  '2027-03-26', // Goede Vrijdag
  '2027-03-28', // Eerste Paasdag
  '2027-03-29', // Tweede Paasdag
  '2027-04-27', // Koningsdag
  '2027-05-05', // Bevrijdingsdag
  '2027-05-06', // Hemelvaartsdag
  '2027-05-16', // Eerste Pinksterdag
  '2027-05-17', // Tweede Pinksterdag
  '2027-12-25', // Eerste Kerstdag
  '2027-12-26', // Tweede Kerstdag
]);

// dateStr = 'YYYY-MM-DD'. true als het een reguliere werkdag is (geen
// weekend, geen NL feestdag).
export function isWerkdag(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = zondag, 6 = zaterdag
  if (day === 0 || day === 6) return false;
  return !NL_FEESTDAGEN.has(dateStr);
}

// Eerstvolgende werkdag op-of-na dateStr, als 'YYYY-MM-DD'. Als dateStr zelf
// al een werkdag is, komt dateStr ongewijzigd terug.
export function volgendeWerkdag(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  let s = dateStr;
  while (!isWerkdag(s)) {
    d.setUTCDate(d.getUTCDate() + 1);
    s = d.toISOString().slice(0, 10);
  }
  return s;
}

// ── generieke sorteer-timestamp — de tabellen die crmTimeline samenvoegt
// gebruiken 3 verschillende created_at-formaten (epoch-ms, 'YYYY-MM-DD
// HH:MM:SS' TEXT default van CURRENT_TIMESTAMP, en 'YYYY-MM-DD' ISO-datum).
// Normaliseer ze allemaal naar epoch-ms zodat één gemengde sort werkt. ──────
function toMs(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00Z`) || 0;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return Date.parse(`${s.replace(' ', 'T')}Z`) || 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// ── generieke activiteit-logger — hergebruikt door crmActivities (POST) EN
// door outreach.js (conversiedoel: status_change bij geinteresseerd/afgewezen)
// zodat er maar één implementatie is van "schrijf een crm_activities-rij". ──
export async function logCrmActivity(env, { entityType, entityId, soort, titel, body, meta, createdBy, pinned }) {
  await env.PORTAL_DB.prepare(
    `INSERT INTO crm_activities (entity_type, entity_id, soort, titel, body, meta_json, pinned, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    entityType, entityId, soort,
    (titel || null), (body || null),
    meta ? JSON.stringify(meta) : null,
    pinned ? 1 : 0,
    createdBy || null,
  ).run();
}

// ── prospect-conversiedoel — annuleert openstaande follow-up-concepten zodra
// een prospect geinteresseerd of afgewezen wordt, zodat er nooit nog een
// follow-up-mail verstuurd wordt naar een prospect die al gereageerd heeft.
// Aangeroepen vanuit outreach.js's outreachUpdateProspect. ───────────────────
export async function annuleerOpenstaandeFollowups(env, prospectId) {
  await env.PORTAL_DB.prepare(
    `UPDATE outreach_mails SET status = 'geannuleerd'
     WHERE prospect_id = ? AND soort = 'followup' AND status IN ('concept', 'goedgekeurd')`,
  ).bind(prospectId).run();
}

// ── GET/POST/PATCH /api/admin/crm/activities ────────────────────────────────
const ACTIVITY_SOORTEN = ['email_out', 'email_in', 'call', 'note', 'status_change', 'task', 'ai'];
const ENTITY_TYPES = ['prospect', 'customer', 'deal'];

export async function crmActivities(request, env) {
  const method = request.method;
  const db = env.PORTAL_DB;

  if (method === 'POST') {
    const b = await request.json().catch(() => null);
    if (!b?.entity_type || !ENTITY_TYPES.includes(b.entity_type) || !b?.entity_id) {
      return errorResponse('Ongeldige entiteit', 400);
    }
    if (!b?.soort || !ACTIVITY_SOORTEN.includes(b.soort)) return errorResponse('Ongeldig soort', 400);

    const user = await getSessionUser(request, env);
    await logCrmActivity(env, {
      entityType: b.entity_type,
      entityId: b.entity_id,
      soort: b.soort,
      titel: b.titel ? b.titel.toString().slice(0, 300) : null,
      body: b.body ? b.body.toString().slice(0, 8000) : null,
      meta: b.meta || null,
      createdBy: user?.naam || user?.email || null,
      pinned: !!b.pinned,
    });
    const row = await db.prepare('SELECT * FROM crm_activities WHERE id = last_insert_rowid()').first();
    return jsonResponse({ ok: true, activity: row });
  }

  if (method === 'PATCH') {
    const b = await request.json().catch(() => null);
    if (!b?.id) return errorResponse('Activiteit-id ontbreekt', 400);
    const existing = await db.prepare('SELECT id FROM crm_activities WHERE id = ?').bind(b.id).first();
    if (!existing) return errorResponse('Activiteit niet gevonden', 404);
    const pinned = b.pinned ? 1 : 0;
    await db.prepare('UPDATE crm_activities SET pinned = ? WHERE id = ?').bind(pinned, b.id).run();
    const row = await db.prepare('SELECT * FROM crm_activities WHERE id = ?').bind(b.id).first();
    return jsonResponse({ ok: true, activity: row });
  }

  // GET — list by entity_type + entity_id
  const url = new URL(request.url);
  const entityType = url.searchParams.get('entity_type');
  const entityId = url.searchParams.get('entity_id');
  if (!entityType || !ENTITY_TYPES.includes(entityType) || !entityId) {
    return errorResponse('entity_type en entity_id zijn verplicht', 400);
  }
  const rows = (await db.prepare(
    `SELECT * FROM crm_activities WHERE entity_type = ? AND entity_id = ?
     ORDER BY pinned DESC, created_at DESC`,
  ).bind(entityType, entityId).all()).results || [];
  return jsonResponse({ ok: true, activities: rows.map((r) => ({ ...r, meta: safeParseJson(r.meta_json) })) });
}

// ── GET/POST/PATCH /api/admin/crm/deals ─────────────────────────────────────
const DEAL_STATUS = ['open', 'won', 'lost'];

export async function crmDeals(request, env) {
  const method = request.method;
  const db = env.PORTAL_DB;

  if (method === 'POST') {
    const b = await request.json().catch(() => null);
    if (!b?.naam || !b?.stage) return errorResponse('Naam en stage zijn verplicht', 400);
    const pipeline = (b.pipeline || 'services').toString().slice(0, 40);
    const waardeCent = Number.isFinite(Number(b.waarde_cent)) ? Math.max(0, parseInt(b.waarde_cent, 10)) : 0;
    const kansPct = Number.isFinite(Number(b.kans_pct)) ? Math.min(100, Math.max(0, parseInt(b.kans_pct, 10))) : 50;

    const inserted = await db.prepare(
      `INSERT INTO crm_deals (entity_type, entity_id, naam, pipeline, stage, waarde_cent, kans_pct, verwachte_sluiting)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      b.entity_type || null, b.entity_id ?? null, b.naam.toString().slice(0, 200),
      pipeline, b.stage.toString().slice(0, 60), waardeCent, kansPct, b.verwachte_sluiting || null,
    ).run();
    const deal = await db.prepare('SELECT * FROM crm_deals WHERE id = ?').bind(inserted.meta.last_row_id).first();
    return jsonResponse({ ok: true, deal });
  }

  if (method === 'PATCH') {
    const b = await request.json().catch(() => null);
    if (!b?.id) return errorResponse('Deal-id ontbreekt', 400);
    const current = await db.prepare('SELECT * FROM crm_deals WHERE id = ?').bind(b.id).first();
    if (!current) return errorResponse('Deal niet gevonden', 404);

    const stage = b.stage !== undefined ? b.stage.toString().slice(0, 60) : current.stage;
    const waardeCent = b.waarde_cent !== undefined
      ? Math.max(0, parseInt(b.waarde_cent, 10) || 0) : current.waarde_cent;
    const kansPct = b.kans_pct !== undefined
      ? Math.min(100, Math.max(0, parseInt(b.kans_pct, 10) || 0)) : current.kans_pct;
    const verwachteSluiting = b.verwachte_sluiting !== undefined ? b.verwachte_sluiting : current.verwachte_sluiting;

    // Status: expliciet meegegeven wint. Anders volgt status automatisch de
    // eindstadia van de services-pipeline (kanban drag-drop naar de kolom
    // "gewonnen"/"verloren" hoeft dan geen aparte status-PATCH te sturen).
    let status = b.status !== undefined ? b.status : current.status;
    if (b.status === undefined) {
      if (stage === 'gewonnen') status = 'won';
      else if (stage === 'verloren') status = 'lost';
    }
    if (!DEAL_STATUS.includes(status)) return errorResponse('Ongeldige status', 400);

    const wordtGewonnen = status === 'won' && current.status !== 'won';
    const wonAt = wordtGewonnen ? today() : (status === 'won' ? current.won_at : null);
    const lostReden = status === 'lost' ? (b.lost_reden !== undefined ? b.lost_reden : current.lost_reden) : null;

    await db.prepare(
      `UPDATE crm_deals SET stage = ?, waarde_cent = ?, kans_pct = ?, verwachte_sluiting = ?, status = ?, won_at = ?, lost_reden = ?
       WHERE id = ?`,
    ).bind(stage, waardeCent, kansPct, verwachteSluiting, status, wonAt, lostReden, b.id).run();

    const deal = await db.prepare('SELECT * FROM crm_deals WHERE id = ?').bind(b.id).first();
    return jsonResponse({ ok: true, deal });
  }

  // GET — filter by pipeline/status
  const url = new URL(request.url);
  const pipeline = url.searchParams.get('pipeline');
  const status = url.searchParams.get('status');
  let sql = 'SELECT * FROM crm_deals WHERE 1=1';
  const binds = [];
  if (pipeline) { sql += ' AND pipeline = ?'; binds.push(pipeline); }
  if (status) { sql += ' AND status = ?'; binds.push(status); }
  sql += ' ORDER BY created_at DESC';
  const rows = (await db.prepare(sql).bind(...binds).all()).results || [];
  return jsonResponse({ ok: true, deals: rows });
}

// ── unified timeline — crm_activities + bron-specifieke rijen ──────────────
async function buildTimeline(env, entityType, entityId) {
  const db = env.PORTAL_DB;
  const rows = [];

  const activities = (await db.prepare(
    'SELECT * FROM crm_activities WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
  ).bind(entityType, entityId).all()).results || [];
  activities.forEach((a) => rows.push({
    soort: a.soort, titel: a.titel, body: a.body, meta: safeParseJson(a.meta_json),
    pinned: !!a.pinned, created_at: a.created_at, bron_tabel: 'crm_activities',
  }));

  if (entityType === 'prospect') {
    const mails = (await db.prepare(
      'SELECT * FROM outreach_mails WHERE prospect_id = ? ORDER BY created_at DESC',
    ).bind(entityId).all()).results || [];
    mails.forEach((m) => {
      const ev = safeParseJson(m.evaluatie);
      rows.push({
        soort: 'email_out', titel: m.onderwerp, body: m.body,
        meta: {
          mail_id: m.id, mail_soort: m.soort, status: m.status,
          evaluatie_score: ev ? { psychologie: ev.psychologie?.score, marketing: ev.marketing?.score } : null,
        },
        pinned: false, created_at: m.verzonden_at || m.created_at, bron_tabel: 'outreach_mails',
      });
    });
  }

  if (entityType === 'customer') {
    const tickets = (await db.prepare(
      'SELECT * FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC',
    ).bind(entityId).all()).results || [];
    tickets.forEach((t) => rows.push({
      soort: 'support_ticket', titel: t.onderwerp, body: t.bericht,
      meta: { status: t.status, admin_antwoord: t.admin_antwoord || null },
      pinned: false, created_at: t.created_at, bron_tabel: 'support_tickets',
    }));

    const requests = (await db.prepare(
      'SELECT * FROM service_requests WHERE customer_id = ? ORDER BY created_at DESC',
    ).bind(entityId).all()).results || [];
    requests.forEach((r) => rows.push({
      soort: 'service_request', titel: r.type, body: r.bericht,
      meta: { status: r.status, product_key: r.product_key || null },
      pinned: false, created_at: r.created_at, bron_tabel: 'service_requests',
    }));
  }

  return rows.sort((a, b) => toMs(b.created_at) - toMs(a.created_at));
}

// ── GET /api/admin/crm/timeline?entity_type=&entity_id= ────────────────────
export async function crmTimeline(request, env) {
  const url = new URL(request.url);
  const entityType = url.searchParams.get('entity_type');
  const entityId = url.searchParams.get('entity_id');
  if (!entityType || !ENTITY_TYPES.includes(entityType) || !entityId) {
    return errorResponse('entity_type en entity_id zijn verplicht', 400);
  }
  const timeline = await buildTimeline(env, entityType, entityId);
  return jsonResponse({ ok: true, timeline });
}

// ── GET /api/admin/crm/pipeline?pipeline=outreach|services ─────────────────
function dagenSinds(dateStr) {
  if (!dateStr) return null;
  const ms = toMs(dateStr);
  if (!ms) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

export async function crmPipelineData(request, env) {
  const url = new URL(request.url);
  const pipeline = url.searchParams.get('pipeline') === 'services' ? 'services' : 'outreach';
  const db = env.PORTAL_DB;

  const stages = (await db.prepare(
    'SELECT stage, volgorde, rot_dagen FROM crm_stages WHERE pipeline = ? ORDER BY volgorde',
  ).bind(pipeline).all()).results || [];
  const rotDagenByStage = new Map(stages.map((s) => [s.stage, s.rot_dagen]));

  let rottingCount = 0;
  let weightedForecastCent = 0;
  const cardsByStage = new Map(stages.map((s) => [s.stage, []]));

  if (pipeline === 'outreach') {
    const prospects = (await db.prepare('SELECT * FROM outreach_prospects').all()).results || [];

    // Gecachte Emma AI-badges (F2) — puur read van ai_field_values, GEEN
    // Gemini-call vanuit een pipeline-load. icp_fit/deal_risk komen alleen
    // mee als ze al eerder (via de prospect-pagina) opgehaald zijn.
    const aiValues = (await db.prepare(
      `SELECT entity_id, veld_naam, waarde FROM ai_field_values
       WHERE entity_type = 'prospect' AND veld_naam IN ('icp_fit', 'deal_risk')`,
    ).all()).results || [];
    const aiByProspect = new Map();
    for (const v of aiValues) {
      const bucket = aiByProspect.get(v.entity_id) || {};
      bucket[v.veld_naam] = safeParseJson(v.waarde);
      aiByProspect.set(v.entity_id, bucket);
    }

    for (const p of prospects) {
      const dagenInStage = dagenSinds(p.laatste_contact || p.created_at);
      const rotDagen = rotDagenByStage.get(p.status);
      const rot = rotDagen != null && dagenInStage != null && dagenInStage > rotDagen;
      if (rot) rottingCount++;
      const ai = aiByProspect.get(p.id) || {};
      const card = {
        type: 'prospect', id: p.id, naam: p.bedrijfsnaam, stad: p.stad,
        email_aanwezig: !!p.email, volgende_actie: p.volgende_actie, volgende_actie_datum: p.volgende_actie_datum,
        dagen_in_stage: dagenInStage, rot,
        ai_icp_fit: ai.icp_fit || null, ai_deal_risk: ai.deal_risk || null,
      };
      if (!cardsByStage.has(p.status)) cardsByStage.set(p.status, []);
      cardsByStage.get(p.status).push(card);
    }
  } else {
    const deals = (await db.prepare("SELECT * FROM crm_deals WHERE pipeline = 'services'").all()).results || [];
    for (const d of deals) {
      const dagenInStage = dagenSinds(d.created_at);
      const rotDagen = rotDagenByStage.get(d.stage);
      const rot = d.status === 'open' && rotDagen != null && dagenInStage != null && dagenInStage > rotDagen;
      if (rot) rottingCount++;
      const gewogenWaarde = Math.round((d.waarde_cent || 0) * (d.kans_pct || 0) / 100);
      if (d.status === 'open') weightedForecastCent += gewogenWaarde;
      const card = {
        type: 'deal', id: d.id, naam: d.naam, waarde_cent: d.waarde_cent, kans_pct: d.kans_pct,
        gewogen_waarde_cent: gewogenWaarde, status: d.status, verwachte_sluiting: d.verwachte_sluiting,
        dagen_in_stage: dagenInStage, rot,
      };
      if (!cardsByStage.has(d.stage)) cardsByStage.set(d.stage, []);
      cardsByStage.get(d.stage).push(card);
    }
  }

  const columns = stages.map((s) => ({
    stage: s.stage, volgorde: s.volgorde, rot_dagen: s.rot_dagen,
    cards: cardsByStage.get(s.stage) || [],
  }));

  return jsonResponse({
    ok: true, pipeline, columns,
    totals: { weighted_forecast_cent: weightedForecastCent, rotting_count: rottingCount },
  });
}

// ── GET /api/admin/search?q= ────────────────────────────────────────────────
// Globale Cmd-K zoekfunctie. % en _ zijn LIKE-wildcards — escapen zodat een
// zoekterm met deze tekens niet als wildcard-patroon gedragen wordt.
function likeTerm(q) {
  return `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
}

export async function crmSearch(request, env) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').toString().trim();
  if (q.length < 2) return jsonResponse({ ok: true, results: [] });

  const db = env.PORTAL_DB;
  const term = likeTerm(q);
  const results = [];

  const prospects = (await db.prepare(
    `SELECT id, bedrijfsnaam, stad FROM outreach_prospects
     WHERE bedrijfsnaam LIKE ? ESCAPE '\\' OR stad LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'
     LIMIT 8`,
  ).bind(term, term, term).all()).results || [];
  prospects.forEach((p) => results.push({
    type: 'prospect', id: p.id, label: p.bedrijfsnaam, sub: p.stad || '',
    url: `/admin/prospect?id=${encodeURIComponent(p.id)}`,
  }));

  const customers = (await db.prepare(
    `SELECT id, bedrijf, stad FROM customers WHERE bedrijf LIKE ? ESCAPE '\\' OR stad LIKE ? ESCAPE '\\' LIMIT 8`,
  ).bind(term, term).all()).results || [];
  customers.forEach((c) => results.push({
    type: 'customer', id: c.id, label: c.bedrijf, sub: c.stad || '',
    url: `/admin/klant?id=${encodeURIComponent(c.id)}`,
  }));

  const deals = (await db.prepare(
    `SELECT id, naam, pipeline, stage FROM crm_deals WHERE naam LIKE ? ESCAPE '\\' LIMIT 8`,
  ).bind(term).all()).results || [];
  deals.forEach((d) => results.push({
    type: 'deal', id: d.id, label: d.naam, sub: `${d.pipeline} · ${d.stage}`,
    url: `/admin/pipeline?pipeline=${encodeURIComponent(d.pipeline)}&deal=${encodeURIComponent(d.id)}`,
  }));

  const tickets = (await db.prepare(
    `SELECT t.id, t.onderwerp, c.bedrijf FROM support_tickets t JOIN customers c ON c.id = t.customer_id
     WHERE t.onderwerp LIKE ? ESCAPE '\\' LIMIT 8`,
  ).bind(term).all()).results || [];
  tickets.forEach((t) => results.push({
    type: 'ticket', id: t.id, label: t.onderwerp, sub: t.bedrijf || '',
    url: '/admin/support',
  }));

  return jsonResponse({ ok: true, results: results.slice(0, 20) });
}
