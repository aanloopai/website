// "Ja, ik start" — stap 2 van 2: het geverifieerde deel.
//
// Alles wat een rij aanmaakt gebeurt hier, na het klikken van de mailtoken.
// De unieke index op service_orders.voorstel_id (migratie 0015) maakt de
// order-creatie idempotent: een dubbelgeklikte mail levert één order.
import { sha256Hex, randomId, createSession, sessionCookie } from './auth.js';
import { escapeHtml } from './escape.js';

const SITE = 'https://aanloopai.nl';
const PORTAL_LOGIN = { href: `${SITE}/portal/login`, label: 'Inloggen op het portaal' };

function vandaag() {
  return new Date().toISOString().slice(0, 10);
}

// Getypeerde fout — handleVoorstelVerify kiest op basis van .code de juiste
// (Nederlandse, niet-technische) boodschap én de juiste vervolglink. Zonder
// dit type viel elke mislukking terug op één generieke tekst, ongeacht of de
// bezoeker al een account heeft (dan is /portal/login het juiste vervolg) of
// niet (dan is /start/ het juiste vervolg).
class VerifyFout extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VerifyFout';
    this.code = code;
  }
}

export async function mintKlantEnOrder(env, { voorstel, email, klant }) {
  const db = env.PORTAL_DB;
  const mail = String(email).toLowerCase();

  let user = await db.prepare('SELECT id, customer_id, naam, role FROM users WHERE email = ?').bind(mail).first();
  let bestondAl = Boolean(user);

  // Expliciete medewerker-guard — vóór elke schrijfactie, niet ná. Leunde
  // eerder stilzwijgend op de NOT NULL-constraint van service_orders.customer_id
  // (een staff-rij heeft customer_id = NULL): dat werkte, maar alleen bij toeval
  // en met een misleidende foutmelding. Een toekomstige schemawijziging zou dat
  // stil kunnen heropenen. Hier stopt de flow expliciet: geen sessie, geen
  // order, geen customer — en ook geen enkele schrijfactie is op dit punt al
  // uitgevoerd.
  if (user && user.role === 'staff') {
    throw new VerifyFout('staff', `E-mailadres ${mail} hoort bij een medewerkersaccount (staff), geen klant-mint uitgevoerd.`);
  }

  if (!user) {
    const customerId = randomId('cust');
    const userId = randomId('usr');
    // Batch: customer + user slagen of falen samen. Los ingevoegd (het
    // eerdere gedrag) kon een wees-customers-rij achterlaten wanneer de
    // user-insert daarna faalde of een gelijktijdig verzoek de race op
    // UNIQUE(email) verloor — zie removeMember() in portal-routes.js voor
    // hetzelfde batch-patroon.
    try {
      await db.batch([
        db.prepare('INSERT INTO customers (id, bedrijf, telefoon, factuur_email, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(customerId, klant?.company || klant?.name || mail, klant?.phone || null, mail, vandaag()),
        db.prepare('INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(userId, customerId, mail, klant?.name || mail, 'eigenaar', vandaag()),
      ]);
    } catch (err) {
      throw new VerifyFout('account_mislukt', `Account aanmaken (customer+user batch) mislukt: ${err?.message || err}`);
    }
    user = { id: userId, customer_id: customerId, naam: klant?.name || mail, role: 'eigenaar' };
    bestondAl = false;
  }

  // Dubbel-abonnement-guard: de bestaande controle in mollie.js werkt per order,
  // niet per klant+product. Zonder deze check kan dezelfde klant via twee
  // intakes twee lopende abonnementen voor hetzelfde product krijgen.
  const actief = await db.prepare(
    "SELECT id FROM subscriptions WHERE customer_id = ? AND product_key = ? AND status IN ('pending_payment','active') LIMIT 1",
  ).bind(user.customer_id, voorstel.product_key).first();
  if (actief) throw new VerifyFout('abonnement', 'Er is al een actief abonnement voor dit product');

  const nieuweOrderId = randomId('ord');
  try {
    await db.prepare(
      'INSERT OR IGNORE INTO service_orders (id, customer_id, user_id, product_key, tier, intake_json, voorstel_id, status, created_at) '
      + "VALUES (?, ?, ?, ?, ?, ?, ?, 'concept', ?)",
    ).bind(nieuweOrderId, user.customer_id, user.id, voorstel.product_key, voorstel.tier_naam,
      JSON.stringify(klant?.answers || {}), voorstel.id, Date.now()).run();
  } catch (err) {
    // De customer/user hierboven bestaan al (nieuw aangemaakt of hergebruikt)
    // — dit is dus geen "geen account"-situatie meer, maar een "account
    // zonder order"-situatie. handleVoorstelVerify wijst dit geval daarom
    // naar /portal/login, niet naar /start/.
    throw new VerifyFout('order_mislukt', `Order-insert mislukt na geslaagde account-stap: ${err?.message || err}`);
  }

  const order = await db.prepare('SELECT id FROM service_orders WHERE voorstel_id = ?').bind(voorstel.id).first();

  return { userId: user.id, orderId: order?.id || nieuweOrderId, bestondAl };
}

// Boodschap + vervolglink per foutcode uit mintKlantEnOrder. Alleen codes die
// betekenen "deze persoon heeft (nu) een account" wijzen naar /portal/login;
// codes zonder vermelding hier (bv. 'account_mislukt', waar de batch zelf
// niets heeft aangemaakt) vallen terug op de generieke /start/-boodschap.
const MINT_FOUTMELDING = {
  staff: {
    bericht: 'Dit e-mailadres hoort bij een medewerkersaccount, niet bij een klantaccount. Log in met uw eigen klantaccount.',
    link: PORTAL_LOGIN,
  },
  abonnement: {
    bericht: 'Voor dit product loopt al een abonnement op uw account. Log in om het te bekijken.',
    link: PORTAL_LOGIN,
  },
  order_mislukt: {
    bericht: 'Uw account bestaat al, maar de bestelling kon niet worden aangemaakt. Log in en probeer het daar opnieuw.',
    link: PORTAL_LOGIN,
  },
};

function foutPagina(bericht, link = { href: `${SITE}/start/`, label: 'Nieuw voorstel maken' }) {
  return new Response(
    `<!DOCTYPE html><html lang="nl"><meta charset="utf-8"><meta name="robots" content="noindex">
     <body style="font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#0f172a">
     <h1 style="font-size:20px">Deze link werkt niet meer</h1>
     <p style="color:#475569">${escapeHtml(bericht)}</p>
     <p><a href="${escapeHtml(link.href)}" style="color:#4f46e5">${escapeHtml(link.label)}</a></p>
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
  if (request.method !== 'POST') return foutPagina('Deze aanvraag kon niet worden verwerkt.');

  // Origin-guard: dezelfde posture als checkOrigin in portal-routes.js. Faalt
  // vóór er ook maar één query wordt gedaan — het claim-token wordt hier dus
  // nooit verbruikt.
  if (request.headers.get('Origin') !== SITE) return foutPagina('Deze aanvraag kon niet worden verwerkt.');

  let t = '';
  try {
    const form = await request.formData();
    t = String(form.get('t') || '');
  } catch { return foutPagina('Deze aanvraag kon niet worden verwerkt.'); }
  if (!/^[0-9a-f]{64}$/.test(t)) return foutPagina('Deze bevestigingslink is ongeldig.');

  const hash = await sha256Hex(t);
  const claim = await env.PORTAL_DB
    .prepare('SELECT voorstel_id, email, expires_at, used FROM voorstel_claims WHERE token_hash = ?')
    .bind(hash).first();
  if (!claim) return foutPagina('Deze bevestigingslink is ongeldig.');
  // Al gebruikt → er bestaat vrijwel zeker al een account (de vorige keer dat
  // dit token nog niet gebruikt was, is precies wanneer mintKlantEnOrder
  // draait) — wijs naar inloggen, niet naar een nieuw voorstel.
  if (claim.used) return foutPagina('Deze bevestigingslink is al gebruikt. U heeft waarschijnlijk al een account.', PORTAL_LOGIN);
  if (Date.now() > claim.expires_at) return foutPagina('Deze bevestigingslink is verlopen.');

  // Atomische eenmalige claim — een dubbele POST mag geen tweede sessie minten.
  const geclaimd = await env.PORTAL_DB
    .prepare('UPDATE voorstel_claims SET used = 1 WHERE token_hash = ? AND used = 0')
    .bind(hash).run();
  // Verloor de race (een gelijktijdig verzoek won de CAS-update hierboven) —
  // die andere aanvraag rondt de account-aanmaak af, dus ook hier is inloggen
  // het juiste vervolg.
  if (geclaimd.meta?.changes !== 1) {
    return foutPagina('Deze bevestigingslink is al gebruikt. U heeft waarschijnlijk al een account.', PORTAL_LOGIN);
  }

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
    const bekend = MINT_FOUTMELDING[err?.code];
    if (bekend) return foutPagina(bekend.bericht, bekend.link);
    return foutPagina('Er ging iets mis bij het afronden van uw aanvraag. Probeer het over enkele minuten opnieuw.');
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
