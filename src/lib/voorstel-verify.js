// "Ja, ik start" — stap 2 van 2: het geverifieerde deel.
//
// Alles wat een rij aanmaakt gebeurt hier, na het klikken van de mailtoken.
// De unieke index op service_orders.voorstel_id (migratie 0015) maakt de
// order-creatie idempotent: een dubbelgeklikte mail levert één order.
import { sha256Hex, randomId, createSession, sessionCookie } from './auth.js';
import { escapeHtml } from './escape.js';

const SITE = 'https://aanloopai.nl';

function vandaag() {
  return new Date().toISOString().slice(0, 10);
}

export async function mintKlantEnOrder(env, { voorstel, email, klant }) {
  const db = env.PORTAL_DB;
  const mail = String(email).toLowerCase();

  let user = await db.prepare('SELECT id, customer_id, naam FROM users WHERE email = ?').bind(mail).first();
  let bestondAl = Boolean(user);

  if (!user) {
    const customerId = randomId('cust');
    await db.prepare('INSERT INTO customers (id, bedrijf, telefoon, factuur_email, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(customerId, klant?.company || klant?.name || mail, klant?.phone || null, mail, vandaag()).run();
    const userId = randomId('usr');
    await db.prepare('INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(userId, customerId, mail, klant?.name || mail, 'eigenaar', vandaag()).run();
    user = { id: userId, customer_id: customerId, naam: klant?.name || mail };
  }

  // Dubbel-abonnement-guard: de bestaande controle in mollie.js werkt per order,
  // niet per klant+product. Zonder deze check kan dezelfde klant via twee
  // intakes twee lopende abonnementen voor hetzelfde product krijgen.
  const actief = await db.prepare(
    "SELECT id FROM subscriptions WHERE customer_id = ? AND product_key = ? AND status IN ('pending_payment','active') LIMIT 1",
  ).bind(user.customer_id, voorstel.product_key).first();
  if (actief) throw new Error('Er is al een actief abonnement voor dit product');

  const nieuweOrderId = randomId('ord');
  await db.prepare(
    'INSERT OR IGNORE INTO service_orders (id, customer_id, user_id, product_key, tier, intake_json, voorstel_id, status, created_at) '
    + "VALUES (?, ?, ?, ?, ?, ?, ?, 'concept', ?)",
  ).bind(nieuweOrderId, user.customer_id, user.id, voorstel.product_key, voorstel.tier_naam,
    JSON.stringify(klant?.answers || {}), voorstel.id, Date.now()).run();

  const order = await db.prepare('SELECT id FROM service_orders WHERE voorstel_id = ?').bind(voorstel.id).first();

  return { userId: user.id, orderId: order?.id || nieuweOrderId, bestondAl };
}

function foutPagina(bericht) {
  return new Response(
    `<!DOCTYPE html><html lang="nl"><meta charset="utf-8"><meta name="robots" content="noindex">
     <body style="font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#0f172a">
     <h1 style="font-size:20px">Deze link werkt niet meer</h1>
     <p style="color:#475569">${escapeHtml(bericht)}</p>
     <p><a href="${SITE}/start/" style="color:#4f46e5">Nieuw voorstel maken</a></p>
     </body></html>`,
    { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

// GET vanuit de mailclient → same-origin POST (CSRF-veilig, zelfde patroon als
// handleInviteAccept in portal-routes.js).
function postFormulier(token) {
  return new Response(
    `<!DOCTYPE html><html lang="nl"><meta charset="utf-8"><meta name="robots" content="noindex">
     <body style="font-family:system-ui,sans-serif;text-align:center;margin-top:80px;color:#0f172a">
     <p>Even geduld — we ronden uw aanvraag af…</p>
     <form id="f" method="POST" action="/api/voorstel/verify">
       <input type="hidden" name="t" value="${escapeHtml(token)}">
       <noscript><button type="submit">Doorgaan</button></noscript>
     </form>
     <script>document.getElementById('f').submit();</script>
     </body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

export async function handleVoorstelVerify(request, env) {
  const url = new URL(request.url);
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return foutPagina('Het portaal is tijdelijk niet beschikbaar.');

  if (request.method === 'GET') {
    const t = url.searchParams.get('t') || '';
    if (!/^[0-9a-f]{64}$/.test(t)) return foutPagina('Deze bevestigingslink is ongeldig.');
    return postFormulier(t);
  }
  if (request.method !== 'POST') return foutPagina('Ongeldige aanvraag.');

  // Origin-guard: dezelfde posture als checkOrigin in portal-routes.js.
  if (request.headers.get('Origin') !== SITE) return foutPagina('Ongeldige herkomst.');

  let t = '';
  try {
    const form = await request.formData();
    t = String(form.get('t') || '');
  } catch { return foutPagina('Ongeldige aanvraag.'); }
  if (!/^[0-9a-f]{64}$/.test(t)) return foutPagina('Deze bevestigingslink is ongeldig.');

  const hash = await sha256Hex(t);
  const claim = await env.PORTAL_DB
    .prepare('SELECT voorstel_id, email, expires_at, used FROM voorstel_claims WHERE token_hash = ?')
    .bind(hash).first();
  if (!claim || claim.used || Date.now() > claim.expires_at) {
    return foutPagina('Deze bevestigingslink is verlopen of al gebruikt.');
  }

  // Atomische eenmalige claim — een dubbele POST mag geen tweede sessie minten.
  const geclaimd = await env.PORTAL_DB
    .prepare('UPDATE voorstel_claims SET used = 1 WHERE token_hash = ? AND used = 0')
    .bind(hash).run();
  if (geclaimd.meta?.changes !== 1) return foutPagina('Deze bevestigingslink is al gebruikt.');

  const voorstel = await env.PORTAL_DB
    .prepare('SELECT id, intake_id, product_key, tier_naam FROM voorstellen WHERE id = ?')
    .bind(claim.voorstel_id).first();
  if (!voorstel) return foutPagina('Dit voorstel bestaat niet meer.');

  const intake = await env.PORTAL_DB
    .prepare('SELECT customer_json, answers_json FROM intake_requests WHERE id = ?')
    .bind(voorstel.intake_id).first();
  let klant = {};
  try { klant = JSON.parse(intake?.customer_json || '{}'); } catch { klant = {}; }
  try { klant.answers = JSON.parse(intake?.answers_json || '{}'); } catch { klant.answers = {}; }

  let mint;
  try {
    mint = await mintKlantEnOrder(env, { voorstel, email: claim.email, klant });
  } catch (err) {
    console.error('[voorstel-verify] minten mislukt:', err?.message || err);
    return foutPagina('U heeft dit product al lopen. Log in op het portaal om uw abonnement te bekijken.');
  }

  await env.PORTAL_DB.prepare("UPDATE voorstellen SET status = 'omgezet' WHERE id = ?").bind(voorstel.id).run();
  await env.PORTAL_DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(Date.now(), mint.userId).run();

  const session = await createSession(mint.userId, env.PORTAL_SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${SITE}/portal/checkout?order=${encodeURIComponent(mint.orderId)}&autostart=1`,
      'Set-Cookie': sessionCookie(session),
    },
  });
}
