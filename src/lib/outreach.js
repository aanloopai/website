// Outreach platform (keukeninbeeld.nl prospect acquisitie) — wired into
// src/lib/admin-routes.js as /api/admin/outreach/*. Staff-guard + CSRF/origin
// guard already run in handleAdminApi before any of these handlers execute.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId } from './auth.js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const KEUKENINBEELD_PROSPECTS_URL = 'https://keukeninbeeld.nl/api/prospects';

function today() { return new Date().toISOString().slice(0, 10); }

// ── Gemini helper ────────────────────────────────────────────────────────────
export async function gemini(env, prompt, { json = false } = {}) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: json ? { responseMimeType: 'application/json' } : {},
      }),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error('Gemini gaf geen tekst terug');
  if (!json) return text;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini JSON-parse mislukt: ${err.message}`);
  }
}

// ── date helper ──────────────────────────────────────────────────────────────
// n werkdagen (ma-vr) na vandaag, als YYYY-MM-DD.
export function werkdagenLater(n) {
  const d = new Date();
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0 = zondag, 6 = zaterdag
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

// ── prompt builders ──────────────────────────────────────────────────────────
function buildGeneratePrompt(prospect, soort, vorigeMail) {
  const ratingRegel = (prospect.rating && prospect.reviews)
    ? `Google-beoordeling: ${prospect.rating} sterren op basis van ${prospect.reviews} reviews.`
    : '';
  const notitieRegel = prospect.notities ? `Notitie over dit bedrijf: ${prospect.notities}.` : '';

  const rolEnAanbod = `
Je schrijft B2B-acquisitiemails voor Keuken in Beeld (keukeninbeeld.nl), een AI-keukenvisualisatie-platform dat koopklare keukenleads levert aan onafhankelijke keukenzaken.

Prospect-gegevens:
- Bedrijfsnaam: ${prospect.bedrijfsnaam}
- Stad: ${prospect.stad || 'onbekend'}
${ratingRegel}
${notitieRegel}
Gebruik deze gegevens om de openingszin (1 zin) persoonlijk te maken — als de rating hoog is of de notitie iets specifieks vermeldt (bijv. "familiebedrijf sinds 1918"), verwijs daar dan naar.

Aanbod-feiten (gebruik UITSLUITEND deze, verzin niets anders):
- Leads bevatten: naam, telefoon, e-mail, postcode, stijl, budgetklasse en termijn van de klant, vaak met een foto van de huidige keuken.
- Tegenofferte-leads bevatten een offerte van een concurrent.
- De eerste lead is GRATIS.
- Daarna betaalt de keukenzaak per lead — geen abonnement.
- Ongeldige leads worden gratis vervangen.
- Schrijf GEEN prijzen in de mail.

Verboden: verzonnen statistieken, verzonnen klantnamen, uitspraken als "duizenden klanten", agressieve urgency, het opeenstapelen van superlatieven.

Stijl: Nederlands, u-vorm, 120-180 woorden, korte alinea's, 1 duidelijke call-to-action vraag (bijvoorbeeld: "Zal ik u de eerstvolgende aanvraag uit regio ${prospect.stad || 'uw regio'} doorsturen?"), professioneel-warme toon.

Ondertekening EXACT dit blok, ongewijzigd:
"Met vriendelijke groet,
Mustafa
Keuken in Beeld · onderdeel van Alfa Reclame · KvK 88606902
info@keukeninbeeld.nl · keukeninbeeld.nl"
`.trim();

  const followupRegel = soort === 'followup' ? `

Dit is een FOLLOW-UP mail. Context — de eerder verstuurde mail (mail1):
Onderwerp: ${vorigeMail?.onderwerp || '(niet gevonden)'}
Inhoud: ${vorigeMail?.body || '(niet gevonden)'}

Regels voor deze follow-up:
- Kort: maximaal 90 woorden.
- Verwijs naar de eerdere mail.
- Meld dat er een geanonimiseerde voorbeeld-leadkaart is bijgevoegd.
- Sluit af met een opt-out zin in de trant van: "Als het niet interessant is, hoor ik het graag."` : '';

  return `${rolEnAanbod}${followupRegel}

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"onderwerp": "...", "body": "..."}`;
}

function buildEvaluatePrompt(mail, prospect) {
  return `
Je bent een senior B2B-marketing- en salespsychologie-reviewer. Beoordeel onderstaande acquisitiemail voor Keuken in Beeld (keukeninbeeld.nl), gericht aan het keukenbedrijf "${prospect?.bedrijfsnaam || 'onbekend'}".

Onderwerp: ${mail.onderwerp}
Inhoud:
${mail.body}

Beoordelingskader:

PSYCHOLOGIE (Cialdini-principes):
- Wederkerigheid: wordt de gratis eerste lead goed ingezet als reciprociteit-hefboom?
- Social proof: alleen toegestaan ZONDER verzonnen cijfers/klanten — vlag elke verzonnen claim.
- Autoriteit: wordt geloofwaardigheid/expertise op gepaste wijze opgebouwd?
- Schaarste: alleen toegestaan zonder nep-urgentie.
- Reactance-vermijding: voelt de mail pusherig of opdringerig?
- Toon/empathie en cognitieve belasting (is de mail makkelijk te lezen en te verwerken?).

MARKETING:
- Onderwerpsregel: open-waardig, geen spam-triggerwoorden.
- Eerste zin: sterke hook?
- Waardepropositie: helder?
- CTA: kwaliteit en duidelijkheid.
- Lengte: gepast?
- Personalisatie: voelt de personalisatie echt aan, of generiek?

BELANGRIJK: als je een verzonnen claim (statistiek, klantnaam, "duizenden klanten" e.d.) detecteert, MOET verdict "eerst-verbeteren" zijn.

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"psychologie":{"score":1-10,"sterk":["..."],"zwak":["..."]},"marketing":{"score":1-10,"sterk":["..."],"zwak":["..."]},"spam_risico":"laag|middel|hoog","verbeterpunten":["concrete herschrijf-suggesties"],"verdict":"verzenden|eerst-verbeteren"}
`.trim();
}

function buildReplyPrompt(prospect, lastMail, replyText) {
  const vorigeMailBlok = lastMail
    ? `Onze laatst verstuurde mail (${lastMail.soort}):\nOnderwerp: ${lastMail.onderwerp}\nInhoud: ${lastMail.body}`
    : 'Er is geen eerdere verstuurde mail gevonden in het systeem.';

  return `
Je bent een sales-assistent voor Keuken in Beeld (keukeninbeeld.nl). Analyseer het onderstaande antwoord van een prospect en stel een reactie voor.

Prospect: ${prospect?.bedrijfsnaam || 'onbekend'} (${prospect?.stad || 'onbekend'})

${vorigeMailBlok}

Ontvangen antwoord van de prospect:
"""
${replyText}
"""

Taken:
1. Bepaal het sentiment: "positief", "neutraal" of "negatief".
2. Vat het antwoord samen in 1 zin.
3. Stel een voorgestelde_status voor: "geinteresseerd", "afgewezen" of "followup".
4. Schrijf een professioneel Nederlands antwoord-concept, ondertekend met exact:
"Met vriendelijke groet,
Mustafa
Keuken in Beeld · onderdeel van Alfa Reclame · KvK 88606902
info@keukeninbeeld.nl · keukeninbeeld.nl"

Prijzen — noem ALLEEN als de prospect in het antwoord expliciet naar de prijs vraagt:
- Shared lead: €40
- Exclusieve lead: €125
- Tegenofferte-lead: €175
- Bundel van 20 leads: €1.200

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"sentiment":"positief|neutraal|negatief","samenvatting":"...","voorgestelde_status":"geinteresseerd|afgewezen|followup","antwoord_onderwerp":"...","antwoord_body":"..."}
`.trim();
}

// ── GET /api/admin/outreach/prospects ───────────────────────────────────────
export async function outreachProspects(env) {
  const db = env.PORTAL_DB;
  const prospects = (await db.prepare(
    `SELECT id, site, sector, bedrijfsnaam, stad, website, email, telefoon, rating, reviews,
       notities, golf, status, volgende_actie, volgende_actie_datum, laatste_contact, created_at
     FROM outreach_prospects ORDER BY created_at DESC`,
  ).all()).results || [];
  const mailRows = (await db.prepare(
    'SELECT id, prospect_id, soort, status, created_at FROM outreach_mails ORDER BY created_at DESC',
  ).all()).results || [];

  const mailsByProspect = new Map();
  for (const m of mailRows) {
    const list = mailsByProspect.get(m.prospect_id) || [];
    list.push({ id: m.id, soort: m.soort, status: m.status, created_at: m.created_at });
    mailsByProspect.set(m.prospect_id, list);
  }

  const now = today();
  const vandaag = [];
  const withMails = prospects.map((p) => {
    if (p.volgende_actie_datum && p.volgende_actie_datum <= now) vandaag.push(p.id);
    return { ...p, mails: mailsByProspect.get(p.id) || [] };
  });

  return jsonResponse({ ok: true, prospects: withMails, vandaag });
}

// ── GET /api/admin/outreach/mail?id= ─────────────────────────────────────────
export async function outreachMailDetail(env, url) {
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Mail-id ontbreekt', 400);
  const mail = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(id).first();
  if (!mail) return errorResponse('Mail niet gevonden', 404);
  return jsonResponse({ ok: true, mail });
}

// ── POST /api/admin/outreach/import ─────────────────────────────────────────
export async function outreachImport(request, env) {
  if (!env.KEUKENINBEELD_TOKEN) return errorResponse('Leadgen niet geconfigureerd', 503);

  let data;
  try {
    const upstream = await fetch(`${KEUKENINBEELD_PROSPECTS_URL}?token=${env.KEUKENINBEELD_TOKEN}`);
    if (!upstream.ok) return errorResponse(`Leadgen-bron onbereikbaar (${upstream.status})`, 502);
    data = await upstream.json();
  } catch (err) {
    console.error('[outreach] import fetch failed:', err.message || err);
    return errorResponse('Leadgen-bron onbereikbaar', 502);
  }

  const records = Array.isArray(data) ? data : (Array.isArray(data?.prospects) ? data.prospects : []);
  const db = env.PORTAL_DB;
  let toegevoegd = 0;
  let overgeslagen = 0;

  for (const r of records) {
    const site = (r.site || '').toString().trim();
    const bedrijfsnaam = (r.bedrijfsnaam || r.bedrijf || r.naam || '').toString().trim();
    if (!bedrijfsnaam) { overgeslagen++; continue; }

    const exists = await db.prepare(
      'SELECT id FROM outreach_prospects WHERE site = ? AND bedrijfsnaam = ?',
    ).bind(site, bedrijfsnaam).first();
    if (exists) { overgeslagen++; continue; }

    await db.prepare(
      `INSERT INTO outreach_prospects
         (site, sector, bedrijfsnaam, stad, website, email, telefoon, rating, reviews, notities, golf, status, volgende_actie, volgende_actie_datum, laatste_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      site || 'keukeninbeeld.nl', r.sector || 'keuken', bedrijfsnaam, r.stad || null, r.website || null,
      r.email || null, r.telefoon || null, r.rating ?? null, r.reviews ?? null,
      r.notities || null, r.golf || null, r.status || 'nieuw',
      r.volgende_actie || null, r.volgende_actie_datum || null, r.laatste_contact || null,
    ).run();
    toegevoegd++;
  }

  return jsonResponse({ ok: true, toegevoegd, overgeslagen });
}

// ── POST /api/admin/outreach/generate ───────────────────────────────────────
export async function outreachGenerateMail(request, env) {
  if (!env.GEMINI_API_KEY) return errorResponse('AI niet geconfigureerd', 503);
  const body = await request.json().catch(() => null);
  const soort = body?.soort;
  if (!body?.prospect_id || !['mail1', 'followup'].includes(soort)) {
    return errorResponse('Ongeldige aanvraag', 400);
  }

  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(body.prospect_id).first();
  if (!prospect) return errorResponse('Prospect niet gevonden', 404);

  let vorigeMail = null;
  if (soort === 'followup') {
    vorigeMail = await env.PORTAL_DB.prepare(
      `SELECT onderwerp, body FROM outreach_mails
       WHERE prospect_id = ? AND soort = 'mail1' AND status = 'verzonden'
       ORDER BY verzonden_at DESC LIMIT 1`,
    ).bind(body.prospect_id).first();
  }

  let result;
  try {
    result = await gemini(env, buildGeneratePrompt(prospect, soort, vorigeMail), { json: true });
  } catch (err) {
    console.error('[outreach] generate failed:', err.message || err);
    return errorResponse('AI-generatie mislukt', 502);
  }
  if (!result?.onderwerp || !result?.body) return errorResponse('AI-generatie mislukt', 502);

  const id = randomId('mail');
  await env.PORTAL_DB.prepare(
    `INSERT INTO outreach_mails (id, prospect_id, soort, onderwerp, body, status, gegenereerd_door, created_at)
     VALUES (?, ?, ?, ?, ?, 'concept', ?, ?)`,
  ).bind(
    id, body.prospect_id, soort,
    result.onderwerp.toString().slice(0, 300), result.body.toString().slice(0, 8000),
    GEMINI_MODEL, Date.now(),
  ).run();

  const mail = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(id).first();
  return jsonResponse({ ok: true, mail });
}

// ── POST /api/admin/outreach/evaluate ───────────────────────────────────────
export async function outreachEvaluateMail(request, env) {
  if (!env.GEMINI_API_KEY) return errorResponse('AI niet geconfigureerd', 503);
  const body = await request.json().catch(() => null);
  if (!body?.mail_id) return errorResponse('Mail-id ontbreekt', 400);

  const mail = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(body.mail_id).first();
  if (!mail) return errorResponse('Mail niet gevonden', 404);
  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(mail.prospect_id).first();

  let evaluatie;
  try {
    evaluatie = await gemini(env, buildEvaluatePrompt(mail, prospect), { json: true });
  } catch (err) {
    console.error('[outreach] evaluate failed:', err.message || err);
    return errorResponse('AI-generatie mislukt', 502);
  }

  await env.PORTAL_DB.prepare('UPDATE outreach_mails SET evaluatie = ? WHERE id = ?')
    .bind(JSON.stringify(evaluatie), body.mail_id).run();

  return jsonResponse({ ok: true, evaluatie });
}

// ── POST /api/admin/outreach/mail (update) ──────────────────────────────────
export async function outreachUpdateMail(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.id) return errorResponse('Mail-id ontbreekt', 400);

  const mail = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(body.id).first();
  if (!mail) return errorResponse('Mail niet gevonden', 404);

  const validStatus = ['concept', 'goedgekeurd', 'verzonden'];
  const status = body.status !== undefined ? body.status : mail.status;
  if (!validStatus.includes(status)) return errorResponse('Ongeldige status', 400);

  const onderwerp = body.onderwerp !== undefined ? body.onderwerp.toString().slice(0, 300) : mail.onderwerp;
  const bodyText = body.body !== undefined ? body.body.toString().slice(0, 8000) : mail.body;
  const wordtVerzonden = status === 'verzonden' && mail.status !== 'verzonden';
  const verzondenAt = wordtVerzonden ? Date.now() : mail.verzonden_at;

  await env.PORTAL_DB.prepare(
    'UPDATE outreach_mails SET onderwerp = ?, body = ?, status = ?, verzonden_at = ? WHERE id = ?',
  ).bind(onderwerp, bodyText, status, verzondenAt, body.id).run();

  if (wordtVerzonden) {
    if (mail.soort === 'mail1') {
      await env.PORTAL_DB.prepare(
        `UPDATE outreach_prospects
         SET laatste_contact = ?, status = 'mail1', volgende_actie = ?, volgende_actie_datum = ?
         WHERE id = ?`,
      ).bind(today(), 'Follow-up mail sturen', werkdagenLater(4), mail.prospect_id).run();
    } else if (mail.soort === 'followup') {
      await env.PORTAL_DB.prepare(
        `UPDATE outreach_prospects
         SET laatste_contact = ?, status = 'followup', volgende_actie = ?, volgende_actie_datum = ?
         WHERE id = ?`,
      ).bind(today(), 'Nabellen', werkdagenLater(3), mail.prospect_id).run();
    }
  }

  const updated = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(body.id).first();
  return jsonResponse({ ok: true, mail: updated });
}

// ── POST /api/admin/outreach/prospect (update) ──────────────────────────────
export async function outreachUpdateProspect(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.id) return errorResponse('Prospect-id ontbreekt', 400);

  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(body.id).first();
  if (!prospect) return errorResponse('Prospect niet gevonden', 404);

  const status = body.status !== undefined ? body.status : prospect.status;
  let volgendeActie = body.volgende_actie !== undefined ? body.volgende_actie : prospect.volgende_actie;
  let volgendeActieDatum = body.volgende_actie_datum !== undefined ? body.volgende_actie_datum : prospect.volgende_actie_datum;

  if (body.status === 'geinteresseerd' && body.volgende_actie === undefined) {
    volgendeActie = 'Gratis proeflead leveren';
  } else if (body.status === 'afgewezen') {
    volgendeActie = null;
    volgendeActieDatum = null;
  }

  const notities = body.notities !== undefined ? body.notities.toString().slice(0, 4000) : prospect.notities;

  await env.PORTAL_DB.prepare(
    'UPDATE outreach_prospects SET status = ?, notities = ?, volgende_actie = ?, volgende_actie_datum = ? WHERE id = ?',
  ).bind(status, notities, volgendeActie, volgendeActieDatum, body.id).run();

  const updated = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?').bind(body.id).first();
  return jsonResponse({ ok: true, prospect: updated });
}

// ── POST /api/admin/outreach/reply ──────────────────────────────────────────
export async function outreachReplySuggestion(request, env) {
  if (!env.GEMINI_API_KEY) return errorResponse('AI niet geconfigureerd', 503);
  const body = await request.json().catch(() => null);
  if (!body?.prospect_id || !body?.reply_text) return errorResponse('Ongeldige aanvraag', 400);

  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(body.prospect_id).first();
  if (!prospect) return errorResponse('Prospect niet gevonden', 404);

  const lastMail = await env.PORTAL_DB.prepare(
    `SELECT onderwerp, body, soort FROM outreach_mails
     WHERE prospect_id = ? AND status = 'verzonden' ORDER BY verzonden_at DESC LIMIT 1`,
  ).bind(body.prospect_id).first();

  const replyText = body.reply_text.toString().slice(0, 8000);
  let analyse;
  try {
    analyse = await gemini(env, buildReplyPrompt(prospect, lastMail, replyText), { json: true });
  } catch (err) {
    console.error('[outreach] reply-analyse failed:', err.message || err);
    return errorResponse('AI-generatie mislukt', 502);
  }
  if (!analyse?.antwoord_body) return errorResponse('AI-generatie mislukt', 502);

  const id = randomId('mail');
  const onderwerp = (analyse.antwoord_onderwerp || `Re: ${lastMail?.onderwerp || ''}`).toString().slice(0, 300);
  await env.PORTAL_DB.prepare(
    `INSERT INTO outreach_mails (id, prospect_id, soort, onderwerp, body, status, gegenereerd_door, created_at)
     VALUES (?, ?, 'reply_suggestie', ?, ?, 'concept', ?, ?)`,
  ).bind(id, body.prospect_id, onderwerp, analyse.antwoord_body.toString().slice(0, 8000), GEMINI_MODEL, Date.now()).run();

  const mail = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(id).first();
  return jsonResponse({ ok: true, analyse, mail });
}

// ── scheduled() notifier helper — used from src/worker.js ───────────────────
// Counts prospects due for follow-up today. Called from the 06:00 UTC cron
// window; worker.js owns the Telegram send + KV dedup so this file stays
// focused on the D1 query.
export async function countVandaagProspects(env) {
  const now = today();
  const row = await env.PORTAL_DB.prepare(
    'SELECT COUNT(*) AS n FROM outreach_prospects WHERE volgende_actie_datum <= ?',
  ).bind(now).first();
  return row?.n || 0;
}
