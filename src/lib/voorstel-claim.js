// "Ja, ik start" — stap 1 van 2.
//
// Deze route maakt met opzet NIETS aan: geen customer, geen user, geen order.
// Ze verstuurt uitsluitend een verificatielink naar het e-mailadres dat bij
// de intake is opgegeven — dat adres komt UITSLUITEND uit de opgeslagen
// intake-rij, nooit uit de request body, zodat een aanroeper niet kan kiezen
// naar wie de mail gaat. Pas na het klikken van die link (taak 11,
// /api/voorstel/verify) ontstaan er rijen, binnen een geverifieerde sessie.
// Zonder deze volgorde is het endpoint een account-injectie- en
// phishingprimitief.
import { sha256Hex, randomToken } from './auth.js';
import { jsonResponse } from './google-auth.js';
import { escapeHtml } from './escape.js';
import { rateLimit } from './rate-limit.js';
import { sendMail } from './portal-routes.js';

export const CLAIM_TTL_MS = 30 * 60 * 1000;
const SITE = 'https://aanloopai.nl';

// Zelfde knopstijl als mailButton() in portal-routes.js. Die functie is
// module-privé in dat bestand (bewust niet aangepast), dus hier lokaal
// herhaald zodat deze mail er hetzelfde uitziet als de rest van het portaal.
function claimButton(href, label) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;
}

// Alleen de binnenkant van de mail — sendMail() in portal-routes.js legt zelf
// mailLayout() eromheen (incl. de KvK-voettekst), dus die wrapper wordt hier
// niet gedupliceerd.
export function bouwClaimMail(verifyUrl, naam) {
  const voornaam = escapeHtml((naam || '').split(' ')[0] || 'daar');
  return `<p>Hallo ${voornaam},</p>
    <p>U wilt starten met Aanloop AI. Klik op de knop hieronder om uw e-mailadres te bevestigen; daarna rondt u de bestelling af.</p>
    ${claimButton(verifyUrl, 'Bevestigen en afronden')}
    <p style="font-size:13px;color:#64748b">Deze link is 30 minuten geldig en kan één keer gebruikt worden. Niet aangevraagd? Negeer deze e-mail — er is niets aangemaakt.</p>`;
}

export async function handleVoorstelClaim(request, env) {
  if (request.method !== 'POST') return jsonResponse({ ok: false }, 405);
  if (!env.PORTAL_DB) return jsonResponse({ ok: false, message: 'Niet beschikbaar' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await rateLimit(env.GOOGLE_TOKENS, `rl:claim:${ip}`, 5, 600);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, message: 'Te veel verzoeken. Probeer het over enkele minuten opnieuw.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, message: 'Ongeldige aanvraag' }, 400); }
  const t = String(body?.t || '');
  if (!/^[0-9a-f]{64}$/.test(t)) return jsonResponse({ ok: false, message: 'Ongeldig voorstel.' }, 400);

  let voorstel;
  try {
    voorstel = await env.PORTAL_DB
      .prepare('SELECT id, intake_id, expires_at FROM voorstellen WHERE token = ?')
      .bind(t).first();
  } catch (err) {
    console.error('[voorstel-claim] D1 query mislukt:', err?.message || err);
    return jsonResponse({ ok: false, message: 'Er ging iets mis. Probeer het over enkele minuten opnieuw.' }, 503);
  }
  if (!voorstel || Date.now() > voorstel.expires_at) {
    return jsonResponse({ ok: false, message: 'Dit voorstel is niet (meer) beschikbaar.' }, 404);
  }

  // Het e-mailadres komt UITSLUITEND uit de intake-rij die bij dit voorstel
  // hoort — de request body wordt hier bewust nooit voor geraadpleegd.
  const intake = await env.PORTAL_DB
    .prepare('SELECT customer_json FROM intake_requests WHERE id = ?')
    .bind(voorstel.intake_id).first();
  let klant = {};
  try { klant = JSON.parse(intake?.customer_json || '{}'); } catch { klant = {}; }
  if (!klant.email) {
    return jsonResponse({ ok: false, message: 'Er ontbreken gegevens bij dit voorstel. Neem contact op via hello@aanloopai.nl.' }, 409);
  }

  const raw = randomToken();
  const now = Date.now();
  try {
    await env.PORTAL_DB.prepare(
      'INSERT INTO voorstel_claims (token_hash, voorstel_id, email, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    ).bind(await sha256Hex(raw), voorstel.id, String(klant.email).toLowerCase(), now + CLAIM_TTL_MS, now).run();
  } catch (err) {
    console.error('[voorstel-claim] claim opslaan mislukt:', err?.message || err);
    return jsonResponse({ ok: false, message: 'Er ging iets mis. Probeer het over enkele minuten opnieuw.' }, 500);
  }

  try {
    await sendMail(
      env,
      klant.email,
      klant.name,
      'Bevestig uw e-mailadres en rond af',
      bouwClaimMail(`${SITE}/api/voorstel/verify?t=${raw}`, klant.name),
    );
  } catch (err) {
    console.error('[voorstel-claim] mail mislukt:', err?.message || err);
    return jsonResponse({ ok: false, message: 'We konden de bevestigingsmail niet versturen. Probeer het over enkele minuten opnieuw.' }, 502);
  }

  await env.PORTAL_DB.prepare("UPDATE voorstellen SET status = 'geclaimd' WHERE id = ? AND status = 'open'")
    .bind(voorstel.id).run();

  return jsonResponse({ ok: true, message: 'Controleer uw e-mail — we hebben u een bevestigingslink gestuurd.' });
}
