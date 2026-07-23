// Task 13 (spec plak C): nudge-cron voor onvoltooide onboarding.
//
// Een order op service_orders.status='in_uitvoering' met een service op
// services.status='onboarding' zit ofwel in de wacht_op_klant-toestand
// (activation.js: wachtOpKlant() — provision() vond de intake niet compleet
// genoeg, en wacht op de klant om /portal/onboarding af te ronden) ofwel in de
// stille-fout-toestand (activation.js: stilFout()/park() — een mislukte
// provisioning-poging). Beide laten services.status ONGEWIJZIGD op
// 'onboarding' staan, dus de SQL-join hieronder kan de twee niet uit elkaar
// houden. D1/SQLite kan geen JSON filteren in SQL (zie ook
// retryFailedProvisions() in activation.js) — dus provisioning_json.status
// wordt hier in JS gecheckt: alleen niet-'fout' orders zijn kandidaat. Een
// 'fout'-order wordt al door retryFailedProvisions() bediend en moet hier
// nooit een klant-mail krijgen.
//
// Nudge-regel: elke 24u een klant-mail met de onboarding-link, zolang
// aantal<3. Op het moment dat aantal de 3e nudge bereikt (2→3) stuurt dit
// ÉÉN alertStaff() in plaats van een klant-mail, en daarna niets meer voor
// deze order — de aantal<3-guard hieronder sluit alle latere ticks uit.
//
// Een niet-provisionable (human-delivered, canProvision()===false) product
// wordt door activateOrder() ook op service_orders.status='in_uitvoering' +
// services.status='onboarding' geparkeerd, maar dat is staff-werk (geen
// wacht_op_klant/'fout' — provisioning_json blijft daar null): die orders
// worden hier expliciet uitgesloten, vóór elke mail/teller-actie.
//
// Best-effort per order (zelfde stijl als retryFailedProvisions()): een fout
// bij één order stopt de rest van de batch niet.
import { sendMail } from './portal-routes.js';
import { alertStaff } from './notify.js';
import { canProvision } from './provisioners/index.js';

const SITE = 'https://aanloopai.nl';
const DAG_MS = 24 * 60 * 60 * 1000;
const MAX_NUDGES = 3;

function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function onboardingMailHtml(naam, orderId) {
  const voornaam = (naam || '').split(' ')[0] || 'daar';
  return `<p>Hallo ${voornaam},</p>
    <p>We wachten nog op een paar gegevens om uw dienst live te zetten. Rond de laatste stap af in uw klantportaal:</p>
    <p style="margin:24px 0"><a href="${SITE}/portal/onboarding?order=${orderId}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">Onboarding afronden</a></p>`;
}

/**
 * @param {object} env  Worker env (PORTAL_DB, BREVO_API_KEY, alert creds)
 * @returns {Promise<void>}
 */
export async function nudgeOnboarding(env) {
  const db = env.PORTAL_DB;
  if (!db) return;

  const rows = (await db.prepare(
    `SELECT so.id AS order_id, so.customer_id AS customer_id, so.created_at AS order_created_at,
            so.product_key AS product_key,
            s.provisioning_json AS provisioning_json,
            n.aantal AS nudge_aantal, n.laatst_genudged AS nudge_laatst, n.created_at AS nudge_created_at
     FROM service_orders so
     JOIN services s ON s.order_id = so.id
     LEFT JOIN onboarding_nudges n ON n.order_id = so.id
     WHERE so.status = 'in_uitvoering' AND s.status = 'onboarding'`,
  ).all()).results || [];

  const now = Date.now();

  for (const row of rows) {
    try {
      // Niet-provisionable (human-delivered) producten parkeert activateOrder()
      // ook op in_uitvoering/onboarding, maar dat is staff-werk — geen
      // wacht_op_klant. Zonder deze guard krijgt zo'n klant onterecht
      // onboarding-mails en na 3 nudges een valse staff-escalatie.
      if (!canProvision(row.product_key)) continue;

      // fout-orders (zie fileheader) worden hier uitgesloten — die zijn geen
      // wacht_op_klant en horen niet genudged te worden.
      const prov = safeParseJson(row.provisioning_json);
      if (prov?.status === 'fout') continue;

      const aantal = row.nudge_aantal || 0;
      if (aantal >= MAX_NUDGES) continue;

      const laatst = row.nudge_laatst || row.nudge_created_at || row.order_created_at;
      if (!laatst || now - laatst <= DAG_MS) continue;

      // Nudge-rij lazily aanmaken op het moment van de eerste nudge —
      // INSERT OR IGNORE zodat een race met een andere tick geen fout gooit.
      await db.prepare(
        'INSERT OR IGNORE INTO onboarding_nudges (order_id, customer_id, aantal, laatst_genudged, created_at) VALUES (?, ?, 0, NULL, ?)',
      ).bind(row.order_id, row.customer_id, now).run();

      const nieuwAantal = aantal + 1;

      if (nieuwAantal >= MAX_NUDGES) {
        // 3e nudge bereikt: geen klant-mail meer, één staff-alert.
        await alertStaff(env, 'Klant rondt onboarding niet af',
          `Order ${row.order_id} (klant ${row.customer_id}) heeft na ${MAX_NUDGES} herinneringen de onboarding nog niet afgerond.\n`
          + `Portaal: ${SITE}/portal/onboarding?order=${row.order_id}`);
      } else {
        const owner = await db.prepare(
          "SELECT email, naam FROM users WHERE customer_id = ? AND role = 'eigenaar' ORDER BY created_at LIMIT 1",
        ).bind(row.customer_id).first();
        if (owner?.email) {
          await sendMail(env, owner.email, owner.naam, 'Rond uw onboarding af — Aanloop AI',
            onboardingMailHtml(owner.naam, row.order_id));
        }
      }

      await db.prepare(
        'UPDATE onboarding_nudges SET aantal = ?, laatst_genudged = ? WHERE order_id = ?',
      ).bind(nieuwAantal, now, row.order_id).run();
    } catch (err) {
      console.error('[nudgeOnboarding] nudge mislukt voor order', row.order_id, ':', err?.message || err);
    }
  }
}
