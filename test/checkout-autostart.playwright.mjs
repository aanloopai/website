// Browser-gebaseerde regressietest voor de autostart-flow op
// src/pages/portal/checkout.astro (taak 12 + reviewfix).
//
// Dit is GEEN vitest-test — die pakt alleen server-side modules onder
// test/*.test.js (die het inline <script>-blok van een .astro-pagina niet
// kan importeren). Deze test draait tegen de daadwerkelijk gebouwde HTML
// output met een echte Chromium-browser (Playwright, al aanwezig in
// node_modules — geen nieuwe dependency) en gemockte fetch-responses via
// page.route(). Tijd wordt gevirtualiseerd met Playwright's clock-API
// (page.clock) zodat we de ~15s poll-timeout niet echt hoeven af te wachten.
//
// Draaien:
//   npm run build
//   node test/checkout-autostart.playwright.mjs
//
// Exit code 0 = alle scenario's slagen, 1 = een assertie faalde (details op
// stdout). Niet opgenomen in `npm test` (vitest) omdat deze test een build +
// browser nodig heeft — zie hierboven.

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

const DIST = path.resolve('dist');
const PORT = 4599;
const BASE = `http://localhost:${PORT}`;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2',
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const filePath = path.join(DIST, decodeURIComponent(urlPath));
      if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(filePath, 'index.html'), (err2, data2) => {
            if (err2) { res.writeHead(404); res.end('not found: ' + filePath); return; }
            res.writeHead(200, { 'content-type': 'text/html' });
            res.end(data2);
          });
          return;
        }
        res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
    server.on('error', reject);
  });
}

async function mockOrderAlwaysConcept(page) {
  await page.route('**/api/portal/order*', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, order: { status: 'concept' } }),
  }));
}

async function panelVisible(page, id) {
  return page.locator('#' + id).isVisible().catch(() => false);
}

// ── Scenario's uit taak 12 zelf (basisgedrag, blijven groen na de fix) ────

async function scenarioSuccess(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let startCalled = 0;
  await mockOrderAlwaysConcept(page);
  await page.route('**/api/portal/checkout/start*', route => {
    startCalled++;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, checkoutUrl: 'https://example-mollie.test/pay/abc123' }) });
  });
  await page.route('**example-mollie.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>MOLLIE OK</body></html>' }));
  await page.goto(`${BASE}/portal/checkout/?order=ord_A&autostart=1`);
  await page.waitForURL('**/pay/abc123', { timeout: 5000 });
  assert.equal(startCalled, 1, 'A: checkout/start precies 1x aangeroepen');
  assert.equal(page.url(), 'https://example-mollie.test/pay/abc123', 'A: doorgestuurd naar Mollie');
  await ctx.close();
  console.log('  ✓ A: autostart + succes → directe redirect naar Mollie');
}

async function scenario409(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await mockOrderAlwaysConcept(page);
  await page.route('**/api/portal/checkout/start*', route => route.fulfill({
    status: 409, contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: 'Er is al een checkout gestart voor deze aanvraag. Probeer het opnieuw of neem contact op met support.' }),
  }));
  await page.goto(`${BASE}/portal/checkout/?order=ord_B&autostart=1`);
  await page.waitForSelector('#co-error:not(.hidden)', { timeout: 5000 });
  const msg = await page.locator('#co-error-msg').textContent();
  assert.match(msg, /Er is al een checkout gestart/, 'B: exacte servermelding getoond');
  assert.equal(await page.locator('#co-retry').isDisabled(), false, 'B: retry-knop werkt');
  await ctx.close();
  console.log('  ✓ B: autostart + 409 → foutmelding + werkende retry-knop');
}

async function scenarioNetworkError(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await mockOrderAlwaysConcept(page);
  await page.route('**/api/portal/checkout/start*', route => route.abort('failed'));
  await page.goto(`${BASE}/portal/checkout/?order=ord_C&autostart=1`);
  await page.waitForSelector('#co-error:not(.hidden)', { timeout: 5000 });
  const msg = await page.locator('#co-error-msg').textContent();
  assert.match(msg, /Netwerkfout/, 'C: netwerkfoutmelding getoond');
  await ctx.close();
  console.log('  ✓ C: autostart + netwerkfout → foutmelding');
}

async function scenarioNoAutostart(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let startCalled = 0;
  await mockOrderAlwaysConcept(page);
  await page.route('**/api/portal/checkout/start*', route => { startCalled++; route.fulfill({ status: 200, body: '{}' }); });
  await page.goto(`${BASE}/portal/checkout/?order=ord_D`);
  await page.waitForTimeout(500);
  assert.equal(startCalled, 0, 'D: checkout/start nooit aangeroepen zonder autostart');
  assert.equal(await panelVisible(page, 'co-pending'), true, 'D: co-pending zichtbaar');
  assert.equal(await panelVisible(page, 'co-starting'), false, 'D: co-starting nooit getoond');
  assert.equal(await panelVisible(page, 'co-error'), false, 'D: co-error nooit getoond');
  await ctx.close();
  console.log('  ✓ D: geen autostart → gedrag exact als vóór taak 12');
}

// ── Nieuw: het reviewbugscenario ───────────────────────────────────────────
// Poll blijft 'concept' teruggeven tot (en voorbij) de vroegere 5x3s-
// timeout; checkout-start reageert pas daarna.
//
// Waarom échte tijd i.p.v. page.clock (Playwright's fake-timer-API)?
// Uitgeprobeerd en verworpen: de poll-lus plant zijn volgende setTimeout()
// pas ná een opgeloste fetch(), en die fetch loopt hier via page.route()
// over Playwright's CDP-kanaal — een écht, niet-microtask asynchroon
// rondje. clock.fastForward()/runFor() springt in één klap door de
// virtuele tijd en vuurt alleen de timers af die op dát moment al gepland
// stonden; het wacht niet op de CDP-round-trip die de vólgende timer pas
// registreert. Resultaat (geverifieerd): van 20 "virtuele" seconden komt
// er maar 1 extra poll-tick door, nooit de 5 die nodig zijn om de bug te
// raken — een fake-positive test. Met échte `setTimeout`/`waitForTimeout`
// vuurt de pagina's eigen 3s-interval gewoon 5x af, exact zoals in de
// browser van een klant. Duurt ~16s reëel per scenario — geen 30s (de
// checkout-start-timeout, waar de coordinator specifiek op doelde), en
// bewijst de bug/fix betrouwbaar i.p.v. een timer-race te gokken.

async function scenarioSlowStartThenFail(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await mockOrderAlwaysConcept(page); // elke poll-tick (5x, elke 3s): nog steeds 'concept'

  let pendingRoute = null;
  let startCalled = 0;
  await page.route('**/api/portal/checkout/start*', route => {
    startCalled++;
    pendingRoute = route; // bewust niet meteen fulfillen — "reageert pas daarna"
  });

  await page.goto(`${BASE}/portal/checkout/?order=ord_E&autostart=1`);

  // Oude poll-timeout was 5 pogingen x 3000ms = 15000ms. Ruim daaroverheen
  // wachten (echte tijd) terwijl checkout-start nog steeds niets heeft
  // geantwoord.
  await page.waitForTimeout(16000);

  assert.equal(startCalled, 1, 'E1: checkout/start is precies 1x aangeroepen (geen dubbele start)');
  assert.equal(await panelVisible(page, 'co-wait'), false,
    'E1 — DE BUG: poll mag "u kunt deze pagina sluiten" niet tonen terwijl checkout-start nog onderweg is (er bestaat geen betaling om op te wachten)');
  assert.equal(await panelVisible(page, 'co-starting'), true, 'E1: co-starting blijft zichtbaar tijdens het wachten');

  // Nu antwoordt checkout-start alsnog — met een fout (409).
  await pendingRoute.fulfill({
    status: 409, contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: 'Er is al een checkout gestart voor deze aanvraag. Probeer het opnieuw of neem contact op met support.' }),
  });
  await page.waitForSelector('#co-error:not(.hidden)', { timeout: 5000 });
  assert.equal(await panelVisible(page, 'co-wait'), false, 'E1: co-wait verschijnt ook ná de late fout niet alsnog');
  const msg = await page.locator('#co-error-msg').textContent();
  assert.match(msg, /Er is al een checkout gestart/, 'E1: klant krijgt de echte foutmelding, geen "u kunt sluiten"');
  assert.equal(await page.locator('#co-retry').isDisabled(), false, 'E1: retry-knop staat klaar — klant kan alsnog betalen');

  await ctx.close();
  console.log('  ✓ E1: trage checkout-start (>15s) gevolgd door 409 → nooit co-wait, wel co-error met werkende retry');
}

async function scenarioSlowStartThenSuccess(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await mockOrderAlwaysConcept(page);

  let pendingRoute = null;
  let startCalled = 0;
  await page.route('**/api/portal/checkout/start*', route => {
    startCalled++;
    pendingRoute = route;
  });
  await page.route('**example-mollie.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>MOLLIE OK</body></html>' }));

  await page.goto(`${BASE}/portal/checkout/?order=ord_F&autostart=1`);
  await page.waitForTimeout(16000);

  assert.equal(await panelVisible(page, 'co-wait'), false,
    'F: nog steeds geen "u kunt sluiten" te zien terwijl checkout-start onderweg is');

  // Nu antwoordt checkout-start alsnog — deze keer met succes.
  await pendingRoute.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, checkoutUrl: 'https://example-mollie.test/pay/laat' }),
  });
  await page.waitForURL('**/pay/laat', { timeout: 5000 });
  assert.equal(page.url(), 'https://example-mollie.test/pay/laat',
    'F: een late succesvolle start stuurt de klant alsnog door — hij is nooit verteld dat hij kon sluiten');
  assert.equal(startCalled, 1, 'F: checkout/start precies 1x aangeroepen');

  await ctx.close();
  console.log('  ✓ F: trage checkout-start (>15s) gevolgd door succes → nooit co-wait getoond, alsnog correcte redirect');
}

async function main() {
  const server = await startStaticServer();
  const browser = await chromium.launch();
  let failed = false;
  try {
    console.log('checkout-autostart.playwright.mjs — scenario\'s:');
    await scenarioSuccess(browser);
    await scenario409(browser);
    await scenarioNetworkError(browser);
    await scenarioNoAutostart(browser);
    await scenarioSlowStartThenFail(browser);
    await scenarioSlowStartThenSuccess(browser);
    console.log('\nAlle scenario\'s geslaagd.');
  } catch (err) {
    failed = true;
    console.error('\nFOUT:', err.message);
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(failed ? 1 : 0);
}

main();
