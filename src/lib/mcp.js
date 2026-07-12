// MCP server (F3.3) — Model Context Protocol brug naar de CRM, over
// POST /mcp. JSON-RPC 2.0. Auth: Authorization: Bearer <MCP_SECRET>.
// Alleen leesgereedschap + 1 schrijfgereedschap (notitie_toevoegen). Elke
// tool schrijft zijn eigen SQL — logCrmActivity is de enige gedeelde import
// uit crm.js (zelfde reden als outreach.js/ai-crm.js: 1 implementatie van
// "schrijf een crm_activities-rij").
import { logCrmActivity } from './crm.js';

function jsonRpcResult(id, result) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}
function jsonRpcError(id, code, message) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}

// Constant-time compare — zelfde aanpak als mollie.js's constantTimeEqual
// (geen WebCrypto timingSafeEqual beschikbaar in Workers); lokaal gehouden
// zodat mcp.js self-contained blijft i.p.v. mollie.js's niet-geëxporteerde
// helper te importeren.
function constantTimeEqual(a, b) {
  const aBytes = new TextEncoder().encode(a || '');
  const bBytes = new TextEncoder().encode(b || '');
  const len = Math.max(aBytes.length, bBytes.length, 1);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
  }
  return diff === 0;
}

function today() { return new Date().toISOString().slice(0, 10); }
function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
function dagenSinds(dateStr) {
  if (!dateStr) return null;
  const t = Date.parse(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}
// % en _ zijn LIKE-wildcards — escapen zodat een zoekterm met deze tekens
// niet als wildcard-patroon gedragen wordt (zelfde als crm.js's likeTerm).
function likeTerm(q) {
  return `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
}

const TOOLS = [
  {
    name: 'pipeline_overzicht',
    description: 'Overzicht van beide pipelines (outreach + services): aantallen per stage/status, gewogen forecast, gewonnen omzet laatste 30 dagen, aantal rottende kaarten.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'vandaag_acties',
    description: 'De dagelijkse to-do-lijst: prospects met een geplande actie vandaag-of-eerder, plus rottende open services-deals.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'zoek',
    description: 'Doorzoek prospects, klanten, deals en support-tickets op naam/stad/e-mail/onderwerp.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Zoekterm, minimaal 2 tekens' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'prospect_detail',
    description: 'Volledig prospect-dossier: basisgegevens, laatste 10 CRM-activiteiten, laatste 5 outreach-mails, gecachte AI-velden.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'integer', description: 'outreach_prospects.id' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'deal_lijst',
    description: 'Lijst deals uit crm_deals (inclusief bron), optioneel gefilterd op status, gesorteerd op waarde aflopend.',
    inputSchema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['open', 'won', 'lost'], description: 'Filter op deal-status' } },
      additionalProperties: false,
    },
  },
  {
    name: 'notitie_toevoegen',
    description: 'Voeg een notitie toe aan een prospect, klant of deal (crm_activities, soort=note). Enige schrijf-tool.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', enum: ['prospect', 'customer', 'deal'] },
        entity_id: { type: 'integer', description: 'Numeriek entity-id (prospect/deal). Voor customer: numerieke suffix niet van toepassing — customers hebben een TEXT-id, dit tool ondersteunt alleen numerieke entity_id\'s.' },
        tekst: { type: 'string' },
      },
      required: ['entity_type', 'entity_id', 'tekst'],
      additionalProperties: false,
    },
  },
];

async function toolPipelineOverzicht(env) {
  const db = env.PORTAL_DB;

  const outreachStatus = (await db.prepare(
    'SELECT status, COUNT(*) AS n FROM outreach_prospects GROUP BY status',
  ).all()).results || [];
  const dealStage = (await db.prepare(
    "SELECT stage, COUNT(*) AS n FROM crm_deals WHERE pipeline = 'services' GROUP BY stage",
  ).all()).results || [];
  const forecast = await db.prepare(
    "SELECT SUM(waarde_cent * kans_pct / 100.0) AS cent FROM crm_deals WHERE pipeline = 'services' AND status = 'open'",
  ).first();
  const wonLaatste30 = await db.prepare(
    "SELECT SUM(waarde_cent) AS cent, COUNT(*) AS n FROM crm_deals WHERE pipeline = 'services' AND status = 'won' AND won_at >= date('now', '-30 days')",
  ).first();

  // Rotting — zelfde logica als crm.js's crmPipelineData, hier lokaal
  // herhaald zodat mcp.js zijn eigen SQL blijft schrijven (spec-eis).
  const stages = (await db.prepare('SELECT pipeline, stage, rot_dagen FROM crm_stages').all()).results || [];
  const rotDagenByKey = new Map(stages.map((s) => [`${s.pipeline}:${s.stage}`, s.rot_dagen]));

  const prospects = (await db.prepare('SELECT status, laatste_contact, created_at FROM outreach_prospects').all()).results || [];
  let outreachRottend = 0;
  for (const p of prospects) {
    const rotDagen = rotDagenByKey.get(`outreach:${p.status}`);
    const dagen = dagenSinds(p.laatste_contact || p.created_at);
    if (rotDagen != null && dagen != null && dagen > rotDagen) outreachRottend++;
  }

  const deals = (await db.prepare("SELECT stage, status, created_at FROM crm_deals WHERE pipeline = 'services'").all()).results || [];
  let servicesRottend = 0;
  for (const d of deals) {
    if (d.status !== 'open') continue;
    const rotDagen = rotDagenByKey.get(`services:${d.stage}`);
    const dagen = dagenSinds(d.created_at);
    if (rotDagen != null && dagen != null && dagen > rotDagen) servicesRottend++;
  }

  return {
    outreach: { per_status: outreachStatus, rottend: outreachRottend },
    services: {
      per_stage: dealStage,
      gewogen_forecast_cent: Math.round(forecast?.cent || 0),
      gewonnen_omzet_30d_cent: wonLaatste30?.cent || 0,
      gewonnen_aantal_30d: wonLaatste30?.n || 0,
      rottend: servicesRottend,
    },
  };
}

async function toolVandaagActies(env) {
  const db = env.PORTAL_DB;

  const prospects = (await db.prepare(
    `SELECT id, bedrijfsnaam, status, volgende_actie, volgende_actie_datum FROM outreach_prospects
     WHERE volgende_actie_datum IS NOT NULL AND volgende_actie_datum <= ? ORDER BY volgende_actie_datum ASC LIMIT 20`,
  ).bind(today()).all()).results || [];

  const stages = (await db.prepare("SELECT stage, rot_dagen FROM crm_stages WHERE pipeline = 'services'").all()).results || [];
  const rotDagenByStage = new Map(stages.map((s) => [s.stage, s.rot_dagen]));
  const openDeals = (await db.prepare(
    "SELECT id, naam, stage, waarde_cent, created_at FROM crm_deals WHERE pipeline = 'services' AND status = 'open' LIMIT 50",
  ).all()).results || [];
  const rottendeDeals = openDeals
    .map((d) => {
      const dagen = dagenSinds(d.created_at);
      const rotDagen = rotDagenByStage.get(d.stage);
      return { ...d, dagen_in_stage: dagen, rot: rotDagen != null && dagen != null && dagen > rotDagen };
    })
    .filter((d) => d.rot)
    .slice(0, 10);

  return {
    acties_vandaag: prospects.map((p) => ({
      type: 'prospect', id: p.id, naam: p.bedrijfsnaam, status: p.status,
      volgende_actie: p.volgende_actie, volgende_actie_datum: p.volgende_actie_datum,
    })),
    rottende_deals: rottendeDeals.map((d) => ({
      type: 'deal', id: d.id, naam: d.naam, stage: d.stage, waarde_cent: d.waarde_cent, dagen_in_stage: d.dagen_in_stage,
    })),
  };
}

async function toolZoek(env, args) {
  const q = (args?.query || '').toString().trim();
  if (q.length < 2) return { results: [] };
  const db = env.PORTAL_DB;
  const term = likeTerm(q);
  const results = [];

  const prospects = (await db.prepare(
    `SELECT id, bedrijfsnaam, stad FROM outreach_prospects
     WHERE bedrijfsnaam LIKE ? ESCAPE '\\' OR stad LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'
     LIMIT 10`,
  ).bind(term, term, term).all()).results || [];
  prospects.forEach((p) => results.push({ type: 'prospect', id: p.id, label: p.bedrijfsnaam, sub: p.stad || '' }));

  const customers = (await db.prepare(
    `SELECT id, bedrijf, stad FROM customers WHERE bedrijf LIKE ? ESCAPE '\\' OR stad LIKE ? ESCAPE '\\' LIMIT 10`,
  ).bind(term, term).all()).results || [];
  customers.forEach((c) => results.push({ type: 'customer', id: c.id, label: c.bedrijf, sub: c.stad || '' }));

  const deals = (await db.prepare(
    `SELECT id, naam, pipeline, stage FROM crm_deals WHERE naam LIKE ? ESCAPE '\\' LIMIT 10`,
  ).bind(term).all()).results || [];
  deals.forEach((d) => results.push({ type: 'deal', id: d.id, label: d.naam, sub: `${d.pipeline} · ${d.stage}` }));

  const tickets = (await db.prepare(
    `SELECT t.id, t.onderwerp, c.bedrijf FROM support_tickets t JOIN customers c ON c.id = t.customer_id
     WHERE t.onderwerp LIKE ? ESCAPE '\\' LIMIT 10`,
  ).bind(term).all()).results || [];
  tickets.forEach((t) => results.push({ type: 'ticket', id: t.id, label: t.onderwerp, sub: t.bedrijf || '' }));

  return { results: results.slice(0, 40) };
}

async function toolProspectDetail(env, args) {
  const id = Number(args?.id);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Ongeldig id');
  const db = env.PORTAL_DB;

  const prospect = await db.prepare('SELECT * FROM outreach_prospects WHERE id = ?').bind(id).first();
  if (!prospect) throw new Error('Prospect niet gevonden');

  const activiteiten = (await db.prepare(
    `SELECT soort, titel, body, created_at FROM crm_activities
     WHERE entity_type = 'prospect' AND entity_id = ? ORDER BY created_at DESC LIMIT 10`,
  ).bind(id).all()).results || [];
  const mails = (await db.prepare(
    `SELECT onderwerp, status, verzonden_at FROM outreach_mails WHERE prospect_id = ? ORDER BY created_at DESC LIMIT 5`,
  ).bind(id).all()).results || [];
  const aiVelden = (await db.prepare(
    `SELECT veld_naam, waarde, updated_at FROM ai_field_values WHERE entity_type = 'prospect' AND entity_id = ?`,
  ).bind(id).all()).results || [];

  return {
    prospect,
    activiteiten,
    mails,
    ai_velden: aiVelden.map((v) => ({ veld_naam: v.veld_naam, waarde: safeParseJson(v.waarde), updated_at: v.updated_at })),
  };
}

async function toolDealLijst(env, args) {
  const status = args?.status;
  const db = env.PORTAL_DB;
  let sql = 'SELECT * FROM crm_deals WHERE 1=1';
  const binds = [];
  if (status && ['open', 'won', 'lost'].includes(status)) {
    sql += ' AND status = ?';
    binds.push(status);
  }
  sql += ' ORDER BY waarde_cent DESC LIMIT 50';
  const deals = (await db.prepare(sql).bind(...binds).all()).results || [];
  return { deals };
}

async function toolNotitieToevoegen(env, args) {
  const entityType = args?.entity_type;
  const entityId = Number(args?.entity_id);
  const tekst = (args?.tekst || '').toString();
  if (!['prospect', 'customer', 'deal'].includes(entityType)) throw new Error('Ongeldig entity_type');
  if (!Number.isInteger(entityId) || entityId <= 0) throw new Error('Ongeldig entity_id');
  if (!tekst.trim()) throw new Error('Tekst mag niet leeg zijn');

  await logCrmActivity(env, {
    entityType, entityId, soort: 'note', body: tekst.slice(0, 8000), createdBy: 'mcp',
  });
  return { ok: true };
}

// ── POST /mcp — JSON-RPC 2.0 dispatcher ─────────────────────────────────────
export async function handleMcp(request, env) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!env.MCP_SECRET || !constantTimeEqual(token, env.MCP_SECRET)) {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.method !== 'string') return jsonRpcError(body?.id ?? null, -32600, 'Invalid Request');
  const { id, method, params } = body;

  if (method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'aanloop-crm', version: '1.0.0' },
    });
  }
  if (method === 'notifications/initialized') {
    return new Response(null, { status: 202 });
  }
  if (method === 'tools/list') {
    return jsonRpcResult(id, { tools: TOOLS });
  }
  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};
    try {
      let result;
      if (toolName === 'pipeline_overzicht') result = await toolPipelineOverzicht(env);
      else if (toolName === 'vandaag_acties') result = await toolVandaagActies(env);
      else if (toolName === 'zoek') result = await toolZoek(env, args);
      else if (toolName === 'prospect_detail') result = await toolProspectDetail(env, args);
      else if (toolName === 'deal_lijst') result = await toolDealLijst(env, args);
      else if (toolName === 'notitie_toevoegen') result = await toolNotitieToevoegen(env, args);
      else return jsonRpcError(id, -32601, `Onbekende tool: ${toolName}`);

      return jsonRpcResult(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (err) {
      // Nooit de stack of interne foutdetails lekken naar de MCP-client.
      return jsonRpcError(id, -32000, err.message || 'Tool-fout');
    }
  }

  return jsonRpcError(id, -32601, `Onbekende methode: ${method}`);
}
