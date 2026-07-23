// Order activation — the step that turns a paid order into a live service.
//
// This used to live inline in admin-routes.js and could ONLY be triggered by a
// human clicking in /admin/aanvragen. That left every paid order parked on
// 'ingediend' until someone noticed — while portal/checkout.astro promises the
// customer "we starten direct met de inrichting". Now the Mollie webhook calls
// activateOrder() itself and the admin route reuses the exact same code, so the
// manual click is an override/retry, not a requirement.
//
// State machine (service_orders.status):
//   concept → ingediend        (customer submit, or payment confirmed)
//   ingediend → in_uitvoering  (service row materialised, setup running)
//   in_uitvoering → actief     (the thing the customer paid for actually exists)
//
// An order only reaches 'actief' when its service is really live:
//   * auto-provisionable product (ElevenLabs)  → 'actief' requires a successful
//     provisioning run. Missing key stops at 'in_uitvoering' and alerts staff
//     immediately (config error, not expected to self-heal). A failed run
//     also stops at 'in_uitvoering', but only alerts once 3 consecutive
//     attempts have failed (provisioning_json.attempts, Task 3) — the first
//     two retries are silent, since most failures are transient and the
//     webhook/cron replay retries automatically.
//   * human-delivered product                  → only a staff member can call it
//     done ({manual:true}); the webhook parks it on 'in_uitvoering' and alerts.
//   * self-serve funnel order (voorstel_id set) → a successful provisioning
//     run still stops at 'in_uitvoering' ("wacht_op_klant", spec §5): the
//     order only carries the shallow wizard intake, never the deep portal
//     intake. This is a normal, expected state — NOT a failure — so it never
//     alerts staff (Task 3: it used to alert once as an interim measure; the
//     customer is now nudged through /portal/onboarding instead, spec plak C).
//     Automatic callers (webhook, cron) always respect this wait state. A
//     staff member's explicit {manual:true} click IS allowed to close it out
//     — e.g. after completing the deep configuration by hand outside this
//     system (opening hours, call forwarding, number linking) — since that
//     click is itself the confirmation that the service is genuinely ready.
//
// Every step is idempotent and safe to replay: the Mollie webhook, the 15-minute
// reconcile cron and an admin click can all race, and the unique index on
// services.order_id (migration 0008) guarantees exactly one service per order.
// Provisioning is never run twice for a service that already provisioned
// successfully — that would create (and bill for) a second ElevenLabs agent.
import { randomId } from './auth.js';
import { resolve, canProvision } from './provisioners/index.js';
import { alertStaff } from './notify.js';

function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
const today = () => new Date().toISOString().slice(0, 10);

// True when a provisioning attempt is still owed: never run, or the last run failed.
function needsProvisioning(prov) {
  return !prov || prov.status === 'fout';
}

// An order minted by the self-serve funnel (voorstel-verify.js) carries
// voorstel_id — the only intake it has is the shallow wizard mapping from
// funnel-intake.js, never the full portal/intake.astro schema. The existing
// portal path (admin-created orders, /portal/intake.astro) never sets this
// column, so it stays null there and this check is a no-op for it.
function isFunnelOrder(order) {
  return Boolean(order.voorstel_id);
}

// Third provisioning outcome (spec §5, "wacht_op_klant"): a funnel order whose
// agent provisioned successfully still isn't genuinely live — the deep intake
// hasn't happened yet. This is a normal, expected state, NOT a failure — it
// does not go through park()'s "something broke" alert, and (as of Task 3,
// 2026-07-23) it does not page staff at all. The order sits on
// 'in_uitvoering' (never downgrading an order that is somehow already
// 'actief') until the customer completes the deep intake through
// /portal/onboarding — nudged there by the onboarding-nudge cron (spec plak
// C, Task 8/13) — and that re-runs provisioning, OR until a staff member
// confirms by hand that it is done and closes it out with an explicit
// {manual:true} activation (the two call sites above skip this function
// entirely when manual is set).
//
// Fires-once guard: the UPDATE's WHERE excludes 'in_uitvoering' as well as
// 'actief', so it only actually changes a row (changes === 1) on the ONE call
// that transitions the order INTO the wait state. Every replay after that —
// webhook retry, the reconcile cron, or an admin click without manual:true —
// finds the order already sitting on 'in_uitvoering' and the UPDATE matches
// zero rows. That guard is kept (rather than deleted along with the alert)
// because it is still the only signal that distinguishes a fresh transition
// from a no-op replay, which other callers may come to rely on.
async function wachtOpKlant(db, order, svcId) {
  await db.prepare(
    "UPDATE service_orders SET status = 'in_uitvoering' WHERE id = ? AND status NOT IN ('in_uitvoering', 'actief')",
  ).bind(order.id).run();
  return { status: 'wacht_op_klant', serviceId: svcId, provisioned: true };
}

/**
 * Materialise `order` into a service row and provision it where we can.
 *
 * @param {object} env    Worker env (PORTAL_DB, ELEVENLABS_API_KEY, alert creds)
 * @param {object} order  Full service_orders row.
 * @param {{manual?: boolean}} opts
 *        manual — a staff member clicked "actief" in /admin/aanvragen. Lets a
 *        human-delivered product be marked done, AND lets a self-serve funnel
 *        order (voorstel_id set) skip its wacht_op_klant wait state. It does
 *        NOT let anyone mark an auto-provisionable product live without a
 *        successful provisioning run — a failed/missing run still parks.
 * @returns {Promise<{status: string, serviceId: string|null, provisioned: boolean, blocked?: boolean}>}
 */
export async function activateOrder(env, order, { manual = false } = {}) {
  const db = env.PORTAL_DB;

  // A cancelled order must never provision (it would create — and bill for — an
  // agent for a customer who walked away). Re-open it to 'ingediend' first.
  if (order.status === 'geannuleerd') {
    return { status: 'geannuleerd', serviceId: null, provisioned: false, blocked: true };
  }

  // 1. Exactly one service per order. INSERT OR IGNORE + the unique index makes
  //    concurrent activations converge on the same row instead of duplicating.
  const newId = randomId('svc');
  await db.prepare(
    'INSERT OR IGNORE INTO services (id, customer_id, product_key, naam, tier, status, config_json, started_at, created_at, order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(newId, order.customer_id, order.product_key, order.product_key, order.tier || null,
    'onboarding', order.intake_json || null, today(), today(), order.id).run();

  // Read back rather than trusting `changes`: on a replay the row already
  // exists, and we need ITS id and provisioning state, not the one we minted.
  const service = await db.prepare('SELECT id, provisioning_json FROM services WHERE order_id = ?')
    .bind(order.id).first();
  const svcId = service?.id || newId;
  const prov = safeParseJson(service?.provisioning_json);

  // 2. Decide what still has to happen for this order to be genuinely live.
  const autoProduct = canProvision(order.product_key);

  if (autoProduct && !needsProvisioning(prov)) {
    // Provisioning already succeeded earlier. Re-running it would create (and
    // bill for) a second agent — just make sure the order reflects reality.
    // This is the replay / double-click / cron-rerun path, and it is checked
    // FIRST so that a live service stays live even if the key was rotated out.
    // H-eind-D: `manual` is the escape hatch — a staff member clicking
    // "actief" is an explicit human confirmation that the deep intake really
    // did happen (possibly outside this system entirely), so it may close
    // out a funnel order that would otherwise sit on wacht_op_klant forever.
    // Automatic callers (webhook, cron) never pass manual:true and keep
    // respecting the wait state.
    if (isFunnelOrder(order) && !manual) return wachtOpKlant(db, order, svcId);
    await db.prepare("UPDATE service_orders SET status = 'actief' WHERE id = ?").bind(order.id).run();
    return { status: 'actief', serviceId: svcId, provisioned: true };
  }

  if (autoProduct && !env.ELEVENLABS_API_KEY) {
    // Config error, not a product decision — refuse to fake an active service.
    return park(env, db, order, svcId,
      `Order ${order.id} kan niet worden ingericht — ELEVENLABS_API_KEY ontbreekt`,
      `Product: ${order.product_key}${order.tier ? ` (${order.tier})` : ''}\nKlant: ${order.customer_id}\n\n`
      + 'De klant heeft betaald maar de agent kan niet worden aangemaakt: er is geen ElevenLabs-sleutel geconfigureerd.');
  }

  if (autoProduct) {
    // First run, or a retry after a failure. Both go through the same call —
    // a previously *successful* provisioning is never re-run (see below).
    const provisioner = resolve(order.product_key);
    let result;
    try {
      result = await provisioner.provision(env, {
        service, order, intake: safeParseJson(order.intake_json), customerId: order.customer_id,
      });
    } catch (err) {
      const message = String(err?.message || err).slice(0, 400);
      console.error('[activation] provisioning failed:', message);
      result = { status: 'fout', error: message };
    }

    // The provisioner itself decided the intake isn't complete enough to go
    // live (spec §5, "wacht_op_klant") — this is a normal wait state, not a
    // failure, so it reuses the same non-alerting wait path as the
    // funnel-specific wait below rather than park()'s "something broke" alert.
    // Nothing was provisioned, so provisioning_json is left untouched — the
    // next replay simply re-checks the (possibly by-then-updated) intake.
    if (result.status === 'wacht_op_klant') return wachtOpKlant(db, order, svcId);

    if (result.status === 'fout') {
      // Previously this was written into provisioning_json and never mentioned
      // again: the customer had paid and waited forever for a service that
      // never came up. The failed row is left in place on purpose — the next
      // call (admin retry, cron, webhook replay) sees status 'fout' and tries
      // again.
      //
      // Task 3 (2026-07-23): a single failure no longer pages staff — a
      // transient ElevenLabs blip would otherwise alert on every retry. Track
      // how many consecutive failures this service has had in
      // provisioning_json.attempts (reset only by a successful run, which
      // overwrites this object entirely — see the 'klaar' branch below) and
      // only escalate to park()'s alert once three attempts have failed.
      // Below that threshold the order sits quietly on 'in_uitvoering' via
      // stilFout() so the next replay retries automatically.
      const attempts = (prov?.attempts || 0) + 1;
      await db.prepare('UPDATE services SET provisioning_json = ? WHERE id = ?')
        .bind(JSON.stringify({ ...result, attempts }), svcId).run();

      if (attempts >= 3) {
        return park(env, db, order, svcId,
          `Provisioning MISLUKT voor order ${order.id} (${attempts}e poging)`,
          `Product: ${order.product_key}${order.tier ? ` (${order.tier})` : ''}\nKlant: ${order.customer_id}\nService: ${svcId}\n`
          + `Fout: ${result.error}\n\nDe klant heeft betaald. Dit is de ${attempts}e mislukte poging — los dit op en klik `
          + '"actief" in /admin/aanvragen om opnieuw te proberen.');
      }
      return stilFout(db, order, svcId);
    }

    // Persist what actually happened. This stores the underlying provisioning
    // metadata (agent_id/kb_id/...) — the same shape provisioning used to
    // write directly — so a future needsProvisioning() replay check sees a
    // non-'fout' status and skips re-provisioning. Overwriting the whole
    // object also drops any stale `attempts` count from earlier failures.
    await db.prepare('UPDATE services SET provisioning_json = ? WHERE id = ?')
      .bind(JSON.stringify(result.provisioning), svcId).run();

    // Same manual-escape-hatch reasoning as above: only a human's explicit
    // click may skip straight to 'actief' for a funnel order.
    if (isFunnelOrder(order) && !manual) return wachtOpKlant(db, order, svcId);
    await db.prepare("UPDATE service_orders SET status = 'actief' WHERE id = ?").bind(order.id).run();
    return { status: 'actief', serviceId: svcId, provisioned: true };
  }

  // Human-delivered product. Only a staff member can declare it done.
  if (manual) {
    await db.prepare("UPDATE service_orders SET status = 'actief' WHERE id = ?").bind(order.id).run();
    return { status: 'actief', serviceId: svcId, provisioned: false };
  }

  return park(env, db, order, svcId,
    `Order ${order.id} betaald — handmatige inrichting nodig`,
    `Product: ${order.product_key}${order.tier ? ` (${order.tier})` : ''}\nKlant: ${order.customer_id}\n\n`
    + 'Dit product kan niet automatisch worden ingericht. Rond de inrichting af en zet de order op "actief" in /admin/aanvragen.');
}

// Park an order on 'in_uitvoering' and page staff. Never downgrades an order
// that is already live — an activation attempt that fails on a running service
// must not take that service offline in the admin view.
async function park(env, db, order, svcId, subject, body) {
  await db.prepare("UPDATE service_orders SET status = 'in_uitvoering' WHERE id = ? AND status != 'actief'")
    .bind(order.id).run();
  await alertStaff(env, subject, body);
  return { status: 'in_uitvoering', serviceId: svcId, provisioned: false };
}

// Same status transition as park(), minus the alert: a provisioning failure
// below the attempts threshold (see the 'fout' branch above) is expected to
// resolve itself on the next automatic retry, so it stays quiet.
async function stilFout(db, order, svcId) {
  await db.prepare("UPDATE service_orders SET status = 'in_uitvoering' WHERE id = ? AND status != 'actief'")
    .bind(order.id).run();
  return { status: 'in_uitvoering', serviceId: svcId, provisioned: false };
}

// Task 4: the automatic half of Task 3's silent-retry design. stilFout()
// leaves a failed order sitting quietly on 'in_uitvoering' expecting "the
// next replay" to retry it — but nothing actually replays a webhook or an
// admin click on its own. This is that replay, run every 15 minutes from the
// same cron as reconcilePayments/billMonthlySubscriptions (scheduled(),
// worker.js).
//
// D1/SQLite can't filter JSON fields in SQL, so the query only narrows to
// "candidate orders that still have work to do" (status='in_uitvoering',
// joined to their one service row per the unique index on
// services.order_id) and every provisioning_json check happens in JS below.
// A row with no service yet (still 'ingediend'/'geannuleerd', or genuinely
// human-delivered and already parked without ever provisioning) simply isn't
// 'in_uitvoering' with a 'fout' service, so it never matches.
//
// attempts>=3 is deliberately excluded here too: those orders already paged
// staff via park() (Task 3) and are waiting on a human fix, not another
// silent auto-retry — retrying them again would just repeat the same
// failure every 15 minutes.
//
// Never passes {manual:true}: this is an automatic caller, so a funnel order
// sitting on wacht_op_klant (never 'fout') is untouched, and activateOrder's
// existing replay-safety (idempotent INSERT OR IGNORE, provisioning never
// re-run once it actually succeeded) makes calling it again for every match
// exactly as safe as the webhook/admin-click paths that already do this.
export async function retryFailedProvisions(env) {
  const db = env.PORTAL_DB;
  if (!db) return;

  const rows = (await db.prepare(
    `SELECT so.*, s.provisioning_json AS provisioning_json
     FROM service_orders so
     JOIN services s ON s.order_id = so.id
     WHERE so.status = 'in_uitvoering'`,
  ).all()).results || [];

  const candidates = rows.filter((row) => {
    const prov = safeParseJson(row.provisioning_json);
    return prov?.status === 'fout' && (prov.attempts || 0) < 3;
  });

  // Best-effort, one order at a time (same shape as reconcilePayments in
  // mollie.js): a single order's retry throwing must not stop the rest of
  // the batch from being retried this tick.
  for (const order of candidates) {
    try {
      await activateOrder(env, order);
    } catch (err) {
      console.error('[retryFailedProvisions] retry mislukt voor order', order.id, ':', err?.message || err);
    }
  }
}
