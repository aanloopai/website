// Emma AI-laag (F2) — dynamische AI-velden op prospects (icp_fit/deal_risk/
// volgende_actie_ai), web-grounded onderzoek + signaal-scan, en een dag-teller
// voor kostenbewaking. Zelfde (request, env) + jsonResponse/errorResponse-
// conventie als outreach.js/crm.js; wired into src/lib/admin-routes.js als
// /api/admin/ai/*. Staff-guard + CSRF/origin guard draaien al in
// handleAdminApi voordat een van deze handlers uitgevoerd wordt.
import { jsonResponse, errorResponse } from './google-auth.js';
import { gemini } from './outreach.js';
import { logCrmActivity } from './crm.js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dagen

function today() { return new Date().toISOString().slice(0, 10); }

function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// crm_activities.created_at / ai_field_values.updated_at zijn 'YYYY-MM-DD
// HH:MM:SS' TEXT (CURRENT_TIMESTAMP default, UTC) — zelfde toMs-aanpak als
// crm.js, hier lokaal gehouden zodat ai-crm.js self-contained blijft.
function toMs(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return Date.parse(`${s.replace(' ', 'T')}Z`) || 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

// Defensief JSON-parsen — Gemini geeft soms een ```json-codeblok terug ondanks
// de "zonder markdown-codeblok" instructie in de prompts.
function parseJsonLoose(text) {
  if (typeof text !== 'string') return null;
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(stripped); } catch { return null; }
}

// ── Gemini (web-grounded) helper ────────────────────────────────────────────
// Variant van outreach.js's gemini() met google_search-grounding. Bewust een
// aparte functie i.p.v. gemini() uitbreiden: responseMimeType:'application/
// json' (gemini()'s json:true-pad) is niet betrouwbaar te combineren met
// tools/grounding, dus deze variant geeft altijd platte tekst terug — bij
// JSON-verwachtende aanroepen (aiSignalScan) parsen we zelf defensief.
export async function geminiGrounded(env, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini (grounded) HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini (grounded) gaf geen tekst terug');
  return text;
}

// ── gebruiksteller ───────────────────────────────────────────────────────────
export async function telAiGebruik(env, feature) {
  await env.PORTAL_DB.prepare(
    `INSERT INTO ai_usage (dag, feature, calls) VALUES (?, ?, 1)
     ON CONFLICT(dag, feature) DO UPDATE SET calls = calls + 1`,
  ).bind(today(), feature).run();
}

// ── record-opbouw voor prompt-vulling ───────────────────────────────────────
// Alleen 'prospect' wordt ondersteund in F2 — customers/deals volgen later.
async function buildRecordForAi(env, entityType, entityId) {
  if (entityType !== 'prospect') {
    throw new Error(`AI-record voor entity_type '${entityType}' wordt nog niet ondersteund`);
  }
  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(entityId).first();
  if (!prospect) throw new Error('Prospect niet gevonden');

  const recenteActiviteit = (await env.PORTAL_DB.prepare(
    `SELECT soort, titel, body, created_at FROM crm_activities
     WHERE entity_type = 'prospect' AND entity_id = ? ORDER BY created_at DESC LIMIT 5`,
  ).bind(entityId).all()).results || [];

  return { prospect, recente_activiteit: recenteActiviteit };
}

// ── 1 AI-veld ophalen/vernieuwen — gedeeld door aiFields (GET+POST) ────────
export async function resolveAiField(env, entityType, entityId, veldNaam, { force = false } = {}) {
  const fieldDef = await env.PORTAL_DB.prepare(
    'SELECT * FROM ai_fields WHERE entity_type = ? AND veld_naam = ?',
  ).bind(entityType, veldNaam).first();
  if (!fieldDef) throw new Error(`Onbekend AI-veld: ${entityType}.${veldNaam}`);

  if (!force) {
    const cached = await env.PORTAL_DB.prepare(
      'SELECT * FROM ai_field_values WHERE entity_type = ? AND entity_id = ? AND veld_naam = ?',
    ).bind(entityType, entityId, veldNaam).first();
    if (cached && Date.now() - toMs(cached.updated_at) < CACHE_TTL_MS) {
      return { veld_naam: veldNaam, label: fieldDef.label, waarde: safeParseJson(cached.waarde), updated_at: cached.updated_at };
    }
  }

  const record = await buildRecordForAi(env, entityType, entityId);
  const prompt = fieldDef.prompt_template.replace('{{record}}', JSON.stringify(record));

  const text = await gemini(env, prompt);
  await telAiGebruik(env, `ai_field:${veldNaam}`);
  const waarde = parseJsonLoose(text);
  if (!waarde) throw new Error(`AI-veld ${veldNaam}: kon Gemini-antwoord niet als JSON parsen`);

  await env.PORTAL_DB.prepare(
    `INSERT INTO ai_field_values (entity_type, entity_id, veld_naam, waarde, model, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(entity_type, entity_id, veld_naam) DO UPDATE SET
       waarde = excluded.waarde, model = excluded.model, updated_at = excluded.updated_at`,
  ).bind(entityType, entityId, veldNaam, JSON.stringify(waarde), GEMINI_MODEL).run();

  const row = await env.PORTAL_DB.prepare(
    'SELECT updated_at FROM ai_field_values WHERE entity_type = ? AND entity_id = ? AND veld_naam = ?',
  ).bind(entityType, entityId, veldNaam).first();

  return { veld_naam: veldNaam, label: fieldDef.label, waarde, updated_at: row?.updated_at || null };
}

// ── GET/POST /api/admin/ai/fields ───────────────────────────────────────────
export async function aiFields(request, env) {
  if (!env.GEMINI_API_KEY) return errorResponse('AI niet geconfigureerd', 503);
  const db = env.PORTAL_DB;

  if (request.method === 'POST') {
    const b = await request.json().catch(() => null);
    if (!b?.entity_type || !b?.entity_id || !b?.veld_naam) return errorResponse('Ongeldige aanvraag', 400);
    if (!['prospect'].includes(b.entity_type)) return errorResponse('Onbekend entity_type', 400);
    const eid = Number(b.entity_id);
    if (!Number.isInteger(eid) || eid <= 0) return errorResponse('Ongeldig entity_id', 400);
    try {
      const field = await resolveAiField(env, b.entity_type, eid, b.veld_naam, { force: !!b.force });
      return jsonResponse({ ok: true, field });
    } catch (err) {
      console.error('[ai-crm] aiFields POST mislukt:', err.message || err);
      return errorResponse('AI-generatie mislukt', 502);
    }
  }

  const url = new URL(request.url);
  const entityType = url.searchParams.get('entity_type');
  if (!entityType || !url.searchParams.get('entity_id')) return errorResponse('entity_type en entity_id zijn verplicht', 400);
  if (!['prospect'].includes(entityType)) return errorResponse('Onbekend entity_type', 400);
  const entityId = Number(url.searchParams.get('entity_id'));
  if (!Number.isInteger(entityId) || entityId <= 0) return errorResponse('Ongeldig entity_id', 400);

  const fieldDefs = (await db.prepare('SELECT veld_naam FROM ai_fields WHERE entity_type = ?')
    .bind(entityType).all()).results || [];

  // Sequentieel (niet Promise.all) — voorkomt een burst van gelijktijdige
  // Gemini-calls voor 1 pageload; elk veld is toch onafhankelijk gecached.
  const fields = [];
  for (const fd of fieldDefs) {
    try {
      fields.push(await resolveAiField(env, entityType, entityId, fd.veld_naam, {}));
    } catch (err) {
      console.error('[ai-crm] resolveAiField mislukt voor', fd.veld_naam, ':', err.message || err);
      fields.push({ veld_naam: fd.veld_naam, waarde: null, updated_at: null, error: true });
    }
  }
  return jsonResponse({ ok: true, fields });
}

// ── prompt: web-grounded prospect-onderzoek ─────────────────────────────────
function buildOnderzoekPrompt(prospect) {
  return `
Onderzoek dit Nederlandse keukenbedrijf voor een sales-gesprek namens Keuken in Beeld (keukeninbeeld.nl, een AI-keukenvisualisatie-leadgen-platform).

Bedrijfsnaam: ${JSON.stringify(prospect.bedrijfsnaam || '')}
Stad: ${JSON.stringify(prospect.stad || 'onbekend')}
Website: ${JSON.stringify(prospect.website || 'onbekend')}

Zoek naar: recent nieuws, vacatures, trends in reviews, showroom-wijzigingen/verbouwingen/nieuwe vestigingen, en al het overige dat nuttig is als aanknopingspunt in een sales-gesprek.

Geef een beknopte Nederlandse bullet-samenvatting, maximaal 200 woorden. Noem bronnen inline (bijvoorbeeld tussen haakjes) waar relevant. Begin direct met de bullets, zonder inleidende zin.
`.trim();
}

// ── POST /api/admin/ai/onderzoek ────────────────────────────────────────────
export async function aiOnderzoek(request, env) {
  if (!env.GEMINI_API_KEY) return errorResponse('AI niet geconfigureerd', 503);
  const body = await request.json().catch(() => null);
  if (!body?.prospect_id) return errorResponse('Prospect-id ontbreekt', 400);
  const pid = Number(body.prospect_id);
  if (!Number.isInteger(pid) || pid <= 0) return errorResponse('Ongeldig prospect_id', 400);

  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(pid).first();
  if (!prospect) return errorResponse('Prospect niet gevonden', 404);

  // Cache: laatste 'Onderzoek'-activiteit < 7 dagen oud wordt hergebruikt
  // i.p.v. een nieuwe (kostbare) grounded Gemini-call te doen.
  const cached = await env.PORTAL_DB.prepare(
    `SELECT * FROM crm_activities WHERE entity_type = 'prospect' AND entity_id = ? AND soort = 'ai'
       AND titel LIKE 'Onderzoek%' ORDER BY created_at DESC LIMIT 1`,
  ).bind(pid).first();
  if (cached && Date.now() - toMs(cached.created_at) < CACHE_TTL_MS) {
    return jsonResponse({ ok: true, activity: { ...cached, meta: safeParseJson(cached.meta_json) }, cached: true });
  }

  let summary;
  try {
    summary = await geminiGrounded(env, buildOnderzoekPrompt(prospect));
    await telAiGebruik(env, 'onderzoek');
  } catch (err) {
    console.error('[ai-crm] aiOnderzoek mislukt:', err.message || err);
    return errorResponse('AI-onderzoek mislukt', 502);
  }

  await logCrmActivity(env, {
    entityType: 'prospect', entityId: pid, soort: 'ai',
    titel: `Onderzoek — ${today()}`, body: summary,
  });
  const row = await env.PORTAL_DB.prepare('SELECT * FROM crm_activities WHERE id = last_insert_rowid()').first();
  return jsonResponse({ ok: true, activity: { ...row, meta: safeParseJson(row?.meta_json) } });
}

// ── prompt: web-grounded signaal-check ──────────────────────────────────────
function buildSignaalPrompt(prospect) {
  return `
Is er een NIEUW, opvallend signaal voor dit Nederlandse keukenbedrijf dat relevant is voor sales-opvolging (bijvoorbeeld: vacature, uitbreiding, nieuwe showroom, nieuws, dalende reviews)?

Bedrijfsnaam: ${prospect.bedrijfsnaam}
Stad: ${prospect.stad || 'onbekend'}
Website: ${prospect.website || 'onbekend'}

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"signaal": true|false, "samenvatting": "..."}
`.trim();
}

async function stuurSignaalTelegram(env, prospect, samenvatting) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const text = `🔥 Signaal: ${prospect.bedrijfsnaam} — ${samenvatting}\nhttps://aanloopai.nl/admin/prospect?id=${prospect.id}`;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
  });
}

// ── signaal-scan — used from src/worker.js scheduled() (06:00 werkdag-gate) ─
// Max 5 prospects per run (kostenrem). Elke prospect krijgt altijd een
// crm_activities-rij (Signaal of Signaal-check) zodat de 14-dagen-dedup in de
// SQL-query hieronder werkt, ook als er geen signaal gevonden is. Per-
// prospect try/catch — 1 mislukking mag de rest van de batch niet blokkeren.
export async function aiSignalScan(env) {
  if (!env.GEMINI_API_KEY || !env.PORTAL_DB) return { gescand: 0, signalen: 0 };
  const db = env.PORTAL_DB;

  const prospects = (await db.prepare(
    `SELECT p.* FROM outreach_prospects p
     WHERE p.status IN ('nieuw', 'mail1', 'followup')
       AND NOT EXISTS (
         SELECT 1 FROM crm_activities a
         WHERE a.entity_type = 'prospect' AND a.entity_id = p.id AND a.soort = 'ai'
           AND a.titel LIKE 'Signaal%' AND a.created_at >= datetime('now', '-14 days')
       )
     ORDER BY p.created_at ASC LIMIT 5`,
  ).all()).results || [];

  let signalen = 0;
  for (const prospect of prospects) {
    try {
      const raw = await geminiGrounded(env, buildSignaalPrompt(prospect));
      await telAiGebruik(env, 'signaal_scan');
      const parsed = parseJsonLoose(raw) || {};
      const heeftSignaal = !!parsed.signaal;
      const samenvatting = (parsed.samenvatting || '').slice(0, 2000) || null;

      await logCrmActivity(env, {
        entityType: 'prospect', entityId: prospect.id, soort: 'ai',
        titel: heeftSignaal ? `Signaal — ${today()}` : `Signaal-check — ${today()}`,
        body: samenvatting,
      });

      if (heeftSignaal) {
        signalen++;
        try {
          await stuurSignaalTelegram(env, prospect, samenvatting || '(geen samenvatting)');
        } catch (err) {
          console.error('[ai-crm] signaal-Telegram mislukt voor prospect', prospect.id, ':', err.message || err);
        }
      }
    } catch (err) {
      console.error('[ai-crm] signaal-scan mislukt voor prospect', prospect.id, ':', err.message || err);
    }
  }
  return { gescand: prospects.length, signalen };
}

// ── GET /api/admin/ai/usage ─────────────────────────────────────────────────
export async function aiUsage(env) {
  const db = env.PORTAL_DB;
  const vandaag = (await db.prepare('SELECT feature, calls FROM ai_usage WHERE dag = ? ORDER BY calls DESC')
    .bind(today()).all()).results || [];
  const zevenDagen = (await db.prepare(
    `SELECT feature, SUM(calls) AS calls FROM ai_usage WHERE dag >= date('now', '-7 days')
     GROUP BY feature ORDER BY calls DESC`,
  ).all()).results || [];
  return jsonResponse({ ok: true, vandaag, zeven_dagen: zevenDagen });
}
