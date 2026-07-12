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

// buildImprovePrompt — verbeteraar-prompt voor de verbeter-loop (outreachImproveMail
// / outreachPipeline). Herhaalt ALLE regels uit buildGeneratePrompt (feiten-lijst,
// verboden claims, geen prijzen, 120-180 woorden / follow-up-regels, ondertekening)
// zodat de herschreven versie aan dezelfde eisen voldoet als een verse concept-mail.
function buildImprovePrompt(mail, prospect, evaluatie) {
  const psy = evaluatie?.psychologie || {};
  const mkt = evaluatie?.marketing || {};
  const zwakPsy = (psy.zwak || []).map((z) => `- ${z}`).join('\n') || '- (geen specifieke zwakke punten genoemd)';
  const zwakMkt = (mkt.zwak || []).map((z) => `- ${z}`).join('\n') || '- (geen specifieke zwakke punten genoemd)';
  const verbeterpunten = (evaluatie?.verbeterpunten || []).map((v) => `- ${v}`).join('\n') || '- (geen concrete verbeterpunten genoemd)';

  const ratingRegel = (prospect?.rating && prospect?.reviews)
    ? `Google-beoordeling: ${prospect.rating} sterren op basis van ${prospect.reviews} reviews.`
    : '';
  const notitieRegel = prospect?.notities ? `Notitie over dit bedrijf: ${prospect.notities}.` : '';

  const rolEnAanbod = `
Je bent een mail-verbeteraar voor Keuken in Beeld (keukeninbeeld.nl), een AI-keukenvisualisatie-platform dat koopklare keukenleads levert aan onafhankelijke keukenzaken. Je krijgt een bestaande acquisitiemail plus een kritische evaluatie van een reviewer. Je taak: herschrijf de mail zodat de genoemde zwakke punten en verbeterpunten zijn opgelost, met behoud van alles wat al goed werkt.

Prospect-gegevens:
- Bedrijfsnaam: ${prospect?.bedrijfsnaam || 'onbekend'}
- Stad: ${prospect?.stad || 'onbekend'}
${ratingRegel}
${notitieRegel}

Huidige mail:
Onderwerp: ${mail.onderwerp}
Inhoud:
${mail.body}

Zwakke punten psychologie:
${zwakPsy}

Zwakke punten marketing:
${zwakMkt}

Concrete verbeterpunten van de reviewer:
${verbeterpunten}

Aanbod-feiten (gebruik UITSLUITEND deze, verzin niets anders):
- Leads bevatten: naam, telefoon, e-mail, postcode, stijl, budgetklasse en termijn van de klant, vaak met een foto van de huidige keuken.
- Tegenofferte-leads bevatten een offerte van een concurrent.
- De eerste lead is GRATIS.
- Daarna betaalt de keukenzaak per lead — geen abonnement.
- Ongeldige leads worden gratis vervangen.
- Schrijf GEEN prijzen in de mail.

Verboden: verzonnen statistieken, verzonnen klantnamen, uitspraken als "duizenden klanten", agressieve urgency, het opeenstapelen van superlatieven.

Stijl: Nederlands, u-vorm, korte alinea's, 1 duidelijke call-to-action vraag, professioneel-warme toon.

Ondertekening EXACT dit blok, ongewijzigd:
"Met vriendelijke groet,
Mustafa
Keuken in Beeld · onderdeel van Alfa Reclame · KvK 88606902
info@keukeninbeeld.nl · keukeninbeeld.nl"
`.trim();

  const lengteRegel = mail.soort === 'followup'
    ? `

Dit is een FOLLOW-UP mail. Regels: maximaal 90 woorden, verwijs naar de eerdere mail, meld dat er een geanonimiseerde voorbeeld-leadkaart is bijgevoegd, sluit af met een opt-out zin in de trant van: "Als het niet interessant is, hoor ik het graag."`
    : `

Lengte: 120-180 woorden.`;

  return `${rolEnAanbod}${lengteRegel}

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"onderwerp": "...", "body": "..."}`;
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

STRIKT VERBODEN in het antwoord:
- Verzonnen voorwaarden, garanties of betaalmodellen (zoals "no cure no pay", proefperiodes, kortingen) — de ENIGE voorwaarden zijn: eerste lead gratis, betaling per geleverde lead, geen abonnement, ongeldige leads (fout nummer, buiten regio, dubbel) worden gratis vervangen.
- Verzonnen statistieken, klantnamen of resultaatclaims.
- Toezeggingen over exclusiviteit of regiogrenzen die hierboven niet staan; regiovraag beantwoord je met: leads worden gekoppeld op postcode van de aanvrager.

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

// ── interne kern-helpers — hergebruikt door de route-handlers hieronder EN
// door outreachPipeline (verbeter-loop) zodat er maar één implementatie is
// van "genereer"/"evalueer"/"verbeter". Gooien door bij fouten; de aanroeper
// (route-handler of pipeline) bepaalt hoe de fout wordt gerapporteerd. ────────
async function generateMailInternal(env, prospect, soort) {
  let vorigeMail = null;
  if (soort === 'followup') {
    vorigeMail = await env.PORTAL_DB.prepare(
      `SELECT onderwerp, body FROM outreach_mails
       WHERE prospect_id = ? AND soort = 'mail1' AND status = 'verzonden'
       ORDER BY verzonden_at DESC LIMIT 1`,
    ).bind(prospect.id).first();
  }
  const result = await gemini(env, buildGeneratePrompt(prospect, soort, vorigeMail), { json: true });
  if (!result?.onderwerp || !result?.body) throw new Error('AI-generatie gaf geen geldig resultaat terug');
  return result;
}

async function evaluateMailInternal(env, mail, prospect) {
  return gemini(env, buildEvaluatePrompt(mail, prospect), { json: true });
}

async function improveMailInternal(env, mail, prospect, evaluatie) {
  const result = await gemini(env, buildImprovePrompt(mail, prospect, evaluatie), { json: true });
  if (!result?.onderwerp || !result?.body) throw new Error('AI-verbetering gaf geen geldig resultaat terug');
  return result;
}

async function insertGeneratedMail(env, prospectId, soort, result) {
  const inserted = await env.PORTAL_DB.prepare(
    `INSERT INTO outreach_mails (prospect_id, soort, onderwerp, body, status, gegenereerd_door)
     VALUES (?, ?, ?, ?, 'concept', ?)`,
  ).bind(
    prospectId, soort,
    result.onderwerp.toString().slice(0, 300), result.body.toString().slice(0, 8000),
    GEMINI_MODEL,
  ).run();
  return env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(inserted.meta.last_row_id).first();
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

  let result;
  try {
    result = await generateMailInternal(env, prospect, soort);
  } catch (err) {
    console.error('[outreach] generate failed:', err.message || err);
    return errorResponse('AI-generatie mislukt', 502);
  }

  const mail = await insertGeneratedMail(env, body.prospect_id, soort, result);
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
    evaluatie = await evaluateMailInternal(env, mail, prospect);
  } catch (err) {
    console.error('[outreach] evaluate failed:', err.message || err);
    return errorResponse('AI-generatie mislukt', 502);
  }

  await env.PORTAL_DB.prepare('UPDATE outreach_mails SET evaluatie = ? WHERE id = ?')
    .bind(JSON.stringify(evaluatie), body.mail_id).run();

  return jsonResponse({ ok: true, evaluatie });
}

// ── POST /api/admin/outreach/improve ────────────────────────────────────────
// Verbeteraar-agent: herschrijft een bestaande mail op basis van de laatst
// opgeslagen evaluatie. De oude score is na een herschrijving niet meer geldig
// — evaluatie wordt daarom NULL gezet, zodat de UI/verbeter-knop weer om een
// verse evaluatie vraagt.
export async function outreachImproveMail(request, env) {
  if (!env.GEMINI_API_KEY) return errorResponse('AI niet geconfigureerd', 503);
  const body = await request.json().catch(() => null);
  if (!body?.mail_id) return errorResponse('Mail-id ontbreekt', 400);

  const mail = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(body.mail_id).first();
  if (!mail) return errorResponse('Mail niet gevonden', 404);
  if (!mail.evaluatie) return errorResponse('Eerst evalueren', 400);

  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(mail.prospect_id).first();

  let evaluatie;
  try {
    evaluatie = typeof mail.evaluatie === 'string' ? JSON.parse(mail.evaluatie) : mail.evaluatie;
  } catch {
    evaluatie = null;
  }

  let result;
  try {
    result = await improveMailInternal(env, mail, prospect, evaluatie);
  } catch (err) {
    console.error('[outreach] improve failed:', err.message || err);
    return errorResponse('AI-generatie mislukt', 502);
  }

  await env.PORTAL_DB.prepare(
    'UPDATE outreach_mails SET onderwerp = ?, body = ?, evaluatie = NULL WHERE id = ?',
  ).bind(result.onderwerp.toString().slice(0, 300), result.body.toString().slice(0, 8000), body.mail_id).run();

  const updated = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(body.mail_id).first();
  return jsonResponse({ ok: true, mail: updated });
}

// ── verbeter-loop verdict-check — gedeeld door outreachPipeline ─────────────
function needsImprove(evaluatie) {
  const psyScore = evaluatie?.psychologie?.score;
  const mktScore = evaluatie?.marketing?.score;
  return evaluatie?.verdict === 'eerst-verbeteren'
    || (typeof psyScore === 'number' && psyScore < 8)
    || (typeof mktScore === 'number' && mktScore < 8);
}

// ── POST /api/admin/outreach/pipeline ───────────────────────────────────────
// Volledig automatische verbeter-loop: yazar-agent (genereer) → kontrolör-agent
// (evalueer) → indien nodig verbeteraar-agent → opnieuw kontrolör-agent.
// Max 2 verbeter-rondes. Elke Gemini-fout onderweg breekt de loop af maar
// geeft de tot-dan-toe opgebouwde staat (mail/evaluatie/geschiedenis) terug
// i.p.v. een kale foutmelding, zodat er nooit werk verloren gaat.
export async function outreachPipeline(request, env) {
  if (!env.GEMINI_API_KEY) return errorResponse('AI niet geconfigureerd', 503);
  const body = await request.json().catch(() => null);
  const soort = body?.soort || 'mail1';
  if (!body?.prospect_id || !['mail1', 'followup'].includes(soort)) {
    return errorResponse('Ongeldige aanvraag', 400);
  }

  const prospect = await env.PORTAL_DB.prepare('SELECT * FROM outreach_prospects WHERE id = ?')
    .bind(body.prospect_id).first();
  if (!prospect) return errorResponse('Prospect niet gevonden', 404);

  const MAX_RONDES = 2;
  const geschiedenis = [];

  // 1. Yazar-agent: genereer de eerste concept-mail.
  let genResult;
  try {
    genResult = await generateMailInternal(env, prospect, soort);
  } catch (err) {
    console.error('[outreach] pipeline generate failed:', err.message || err);
    return jsonResponse({ ok: false, error: 'AI-generatie mislukt', rondes: 0, geschiedenis: [] });
  }
  let mail = await insertGeneratedMail(env, body.prospect_id, soort, genResult);

  // 2. Kontrolör-agent: evalueer. Bij lage score of verdict 'eerst-verbeteren'
  //    laat de verbeteraar-agent herschrijven en evalueert de kontrolör opnieuw
  //    — tot max MAX_RONDES verbeter-rondes.
  let evaluatie;
  try {
    evaluatie = await evaluateMailInternal(env, mail, prospect);
  } catch (err) {
    console.error('[outreach] pipeline evaluate failed:', err.message || err);
    return jsonResponse({ ok: false, mail, evaluatie: null, rondes: 0, geschiedenis, error: 'AI-evaluatie mislukt' });
  }
  await env.PORTAL_DB.prepare('UPDATE outreach_mails SET evaluatie = ? WHERE id = ?')
    .bind(JSON.stringify(evaluatie), mail.id).run();
  geschiedenis.push({ ronde: 0, psy: evaluatie?.psychologie?.score, mkt: evaluatie?.marketing?.score, verdict: evaluatie?.verdict });

  let ronde = 0;
  while (needsImprove(evaluatie) && ronde < MAX_RONDES) {
    ronde++;

    let improveResult;
    try {
      improveResult = await improveMailInternal(env, mail, prospect, evaluatie);
    } catch (err) {
      console.error('[outreach] pipeline improve failed:', err.message || err);
      return jsonResponse({ ok: false, mail, evaluatie, rondes: ronde - 1, geschiedenis, error: 'AI-verbetering mislukt' });
    }
    await env.PORTAL_DB.prepare(
      'UPDATE outreach_mails SET onderwerp = ?, body = ?, evaluatie = NULL WHERE id = ?',
    ).bind(improveResult.onderwerp.toString().slice(0, 300), improveResult.body.toString().slice(0, 8000), mail.id).run();
    mail = await env.PORTAL_DB.prepare('SELECT * FROM outreach_mails WHERE id = ?').bind(mail.id).first();

    try {
      evaluatie = await evaluateMailInternal(env, mail, prospect);
    } catch (err) {
      console.error('[outreach] pipeline re-evaluate failed:', err.message || err);
      return jsonResponse({ ok: false, mail, evaluatie: null, rondes: ronde, geschiedenis, error: 'AI-evaluatie mislukt' });
    }
    await env.PORTAL_DB.prepare('UPDATE outreach_mails SET evaluatie = ? WHERE id = ?')
      .bind(JSON.stringify(evaluatie), mail.id).run();
    geschiedenis.push({ ronde, psy: evaluatie?.psychologie?.score, mkt: evaluatie?.marketing?.score, verdict: evaluatie?.verdict });
  }

  return jsonResponse({ ok: true, mail, evaluatie, rondes: ronde, geschiedenis });
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

  const onderwerp = (analyse.antwoord_onderwerp || `Re: ${lastMail?.onderwerp || ''}`).toString().slice(0, 300);
  const inserted = await env.PORTAL_DB.prepare(
    `INSERT INTO outreach_mails (prospect_id, soort, onderwerp, body, status, gegenereerd_door)
     VALUES (?, 'reply_suggestie', ?, ?, 'concept', ?)`,
  ).bind(body.prospect_id, onderwerp, analyse.antwoord_body.toString().slice(0, 8000), GEMINI_MODEL).run();
  const id = inserted.meta.last_row_id;

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

// ── sabah taslak-otomasyonu — used from src/worker.js scheduled() ──────────
// Prospects met status 'mail1' waarvan de follow-up vandaag/eerder gepland
// staat EN die nog geen concept follow-up-mail hebben liggen. Gebruikt vóór
// de Telegram-notificatie om 's ochtends alvast concept follow-ups klaar te
// zetten — de mens hoeft dan alleen te evalueren/versturen i.p.v. te schrijven.
export async function prospectsNeedingFollowupDraft(env) {
  const now = today();
  const rows = (await env.PORTAL_DB.prepare(
    `SELECT p.* FROM outreach_prospects p
     WHERE p.status = 'mail1' AND p.volgende_actie_datum <= ?
       AND NOT EXISTS (
         SELECT 1 FROM outreach_mails m
         WHERE m.prospect_id = p.id AND m.soort = 'followup' AND m.status = 'concept'
       )`,
  ).bind(now).all()).results || [];
  return rows;
}

// Genereert (en bewaart) 1 follow-up concept-mail voor 1 prospect. Bewust
// GEEN evaluatie hier — dat is een extra Gemini-call en de mens evalueert
// toch handmatig in de admin-UI voordat hij verstuurt. Gooit door bij falen;
// de aanroeper (worker.js) vangt per-prospect af zodat 1 mislukking de rest
// van de ochtend-batch niet blokkeert.
export async function generateFollowupDraft(env, prospect) {
  const result = await generateMailInternal(env, prospect, 'followup');
  return insertGeneratedMail(env, prospect.id, 'followup', result);
}
