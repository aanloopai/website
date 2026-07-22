// Browser-gebaseerde end-to-end test voor de volledige koopweg:
// /start (wizard) -> POST /api/intake -> redirect naar /start/voorstel/?t=<token>
// -> GET /api/voorstel -> voorstelpagina toont prijs/setup/ROI.
//
// Zelfde opzet als test/checkout-autostart.playwright.mjs (taak 12): een
// standalone Node-script met een echte Chromium-browser (Playwright, al
// aanwezig in node_modules — geen nieuwe dependency) tegen de daadwerkelijk
// gebouwde `dist/`-output, met gemockte fetch-responses via page.route().
// Bewust NIET de `@playwright/test`-testrunner uit de taak-14-brief: dat
// package staat niet in package.json (alleen het kale `playwright`), en het
// toevoegen ervan zou een tweede, afwijkende manier van E2E-testen naast de
// bestaande introduceren — expliciet verboden door de opdracht.
//
// WAAROM GEMOCKT EN NIET TEGEN EEN ECHTE D1: migratie 0015 (de
// `voorstellen`-tabel) is nog niet tegen de lokale of remote D1 uitgevoerd.
// `leesVoorstelViaToken` in src/worker.js zou dus altijd een D1-fout gooien.
// Deze test bewijst daarom de CLIENT-KANT van de keten: dat de wizard de
// juiste payload naar /api/intake stuurt, dat een teruggegeven
// voorstel_token naar de juiste voorstel-URL redirect, en dat de
// voorstelpagina een geldige /api/voorstel-respons correct rendert
// (prijs/setup/ROI) resp. een ongeldig token nooit meer dan de generieke
// foutstatus toont. Het bewijst NIET dat handleIntake() zelf een rij in
// `voorstellen` wegschrijft, dat berekenRoi()/buildVoorstelData() in de
// worker zelf correct draaien, of dat de Gemini-copy-generatie werkt — die
// server-kant staat al onder dekking van de vitest-suites
// (voorstel.test.js, voorstel-store.test.js, roi.test.js, funnel-map.test.js)
// en van scripts/smoke.mjs zodra migratie 0015 is toegepast.
//
// Prijs/setup-verwachtingen komen NIET uit hardcoded euro's, maar worden
// hier uit src/data/pricing.ts geparsed (zelfde bron als
// src/data/portal-catalog.ts en src/lib/voorstel.js gebruiken) zodat de test
// niet op de verkeerde plek breekt bij een prijswijziging. De ROI-tekst komt
// uit een echte aanroep van src/lib/roi.js#berekenRoi met dezelfde
// wizard-antwoorden als de test invult — geen losstaand verzonnen getal.
//
// Draaien:
//   npm run build
//   npm run e2e
//
// Exit code 0 = beide scenario's slagen, 1 = een assertie faalde (details op
// stdout). Niet opgenomen in `npm test` (vitest) — heeft een build + browser
// nodig, zelfde reden als checkout-autostart.playwright.mjs.

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';
import { randomBytes } from 'crypto';
import { berekenRoi } from '../../src/lib/roi.js';

const DIST = path.resolve('dist');
const PORT = 4598; // andere poort dan checkout-autostart.playwright.mjs (4599) — kunnen naast elkaar draaien
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

// ── Verwachte bedragen afleiden uit de bron, niet hardcoden ────────────────
// Productie-pad (src/lib/voorstel.js#prijsVoorEntry voor serviceId
// 'voice-agent' -> funnel-map.ts entry emma-telefoon/Starter):
//   prijsCent  = getCatalogTier('emma-telefoon','Starter').prijsCent
//              = PORTAL_CORE_497.monthlyCent  (portal-catalog.ts regel 52 -> CORE.monthlyCent)
//   setupCent  = SETUP_CENT_PER_TIER.Starter = EMMA.setup * 100
// Beide constanten staan in src/data/pricing.ts. We lezen die brontekst en
// parsen de velden — geen losse ts-node/tsx-dependency nodig voor een .ts
// import in een los Node-script, en een format-wijziging laat de regex
// hieronder loud falen (throw) i.p.v. stil een verkeerd getal doorgeven.
function extractPricingField(sourceText, constName, field) {
  const re = new RegExp(`export const ${constName}\\s*:[^=]*=\\s*\\{[^}]*\\b${field}:\\s*(\\d+)`);
  const m = sourceText.match(re);
  if (!m) throw new Error(`Kon ${constName}.${field} niet uit src/data/pricing.ts parsen — bron-formaat gewijzigd?`);
  return Number(m[1]);
}

const pricingSrc = fs.readFileSync(path.resolve('src/data/pricing.ts'), 'utf8');
const EXPECTED_PRIJS_CENT = extractPricingField(pricingSrc, 'PORTAL_CORE_497', 'monthlyCent');
const EMMA_SETUP_EURO = extractPricingField(pricingSrc, 'EMMA', 'setup');
const EXPECTED_SETUP_CENT = EMMA_SETUP_EURO * 100;

function euro(cent) {
  return '€' + Math.round(cent / 100).toLocaleString('nl-NL');
}

// Zelfde wizard-antwoorden als scenario A hieronder invult — de mock voor
// /api/voorstel gebruikt hier de ECHTE berekenRoi() op, zodat de
// ROI-verwachting geen los verzonnen getal is maar hetzelfde algoritme als
// de worker (src/lib/voorstel.js roept dezelfde functie aan).
const WIZARD_ANSWERS = { gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' };
const EXPECTED_ROI = berekenRoi(WIZARD_ANSWERS);
assert.equal(EXPECTED_ROI.modus, 'punt', 'testopzet: gekozen invoer moet roi-modus "punt" opleveren');

const TOKEN_RE_64_HEX = /^[0-9a-f]{64}$/;

function mintToken() {
  const t = randomBytes(32).toString('hex');
  assert.match(t, TOKEN_RE_64_HEX, 'testopzet: gemint token moet 64 hex-tekens zijn');
  return t;
}

// ── Scenario A: wizard -> voorstel met prijs, setup-fee en ROI ─────────────
async function scenarioWizardNaarVoorstel(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const token = mintToken();
  let intakeBody = null;

  await page.route('**/api/intake', (route) => {
    intakeBody = JSON.parse(route.request().postData() || '{}');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Aanvraag ontvangen', voorstel_token: token }),
    });
  });

  // Vorm van de respons matcht leesVoorstelViaToken()'s publieke projectie —
  // zie src/pages/start/voorstel/index.astro (Voorstel-interface + isValidVoorstel()).
  await page.route('**/api/voorstel*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        voorstel: {
          productKey: 'emma-telefoon',
          tierNaam: 'Starter',
          prijsCent: EXPECTED_PRIJS_CENT,
          setupCent: EXPECTED_SETUP_CENT,
          roi: EXPECTED_ROI,
          copy: {
            kop: 'Emma neemt vanaf volgende week uw telefoon aan',
            tekst: 'Testcopy voor de e2e-run — geen echte LLM-aanroep in deze test.',
          },
        },
      }),
    });
  });

  await page.goto(`${BASE}/start/`);

  // Stap 0: dienst-keuze — auto-advance na 300ms (zie start.astro script).
  await page.locator('.start-service-card[data-service-id="voice-agent"]').click();
  await page.waitForSelector('.start-step[data-step="1"]:not(.hidden)', { timeout: 5000 });

  // Stap 1: dienst-specifieke velden voor voice-agent (SERVICE_QUESTIONS in
  // start.astro) — huidige_lijn/call_volume/openingstoon zijn required en
  // MOETEN ingevuld worden, anders blokkeert validateStep() de volgende stap.
  await page.fill('#sf-huidige_lijn', '+31612345678');
  await page.selectOption('#sf-call_volume', '10-30');
  await page.selectOption('#sf-openingstoon', 'Zakelijk en warm');
  await page.selectOption('#sf-gemiste_gesprekken_week', WIZARD_ANSWERS.gemiste_gesprekken_week);
  await page.selectOption('#sf-gemiddelde_klantwaarde', WIZARD_ANSWERS.gemiddelde_klantwaarde);
  await page.click('#start-next-btn');

  // Stap 2: contactgegevens + consent.
  await page.waitForSelector('.start-step[data-step="2"]:not(.hidden)', { timeout: 5000 });
  await page.fill('#start-bedrijfsnaam', 'E2E Testbedrijf');
  await page.fill('#start-naam', 'Test Persoon');
  await page.fill('#start-email', `e2e+${Date.now()}@example.nl`);
  await page.check('#start-consent');
  await page.click('#start-submit-btn');

  await page.waitForURL(new RegExp(`/start/voorstel/\\?t=${token}$`), { timeout: 10000 });

  assert.ok(intakeBody, 'A: POST /api/intake is aangeroepen');
  assert.equal(intakeBody.service_id, 'voice-agent', 'A: juiste dienst verstuurd');
  assert.equal(intakeBody.consent, true, 'A: consent verstuurd als true');
  assert.equal(intakeBody.answers?.gemiste_gesprekken_week, WIZARD_ANSWERS.gemiste_gesprekken_week, 'A: roi-antwoord 1 in payload');
  assert.equal(intakeBody.answers?.gemiddelde_klantwaarde, WIZARD_ANSWERS.gemiddelde_klantwaarde, 'A: roi-antwoord 2 in payload');
  assert.match(new URL(page.url()).pathname + new URL(page.url()).search, /^\/start\/voorstel\/\?t=[0-9a-f]{64}$/,
    'A: geredirect naar voorstel-URL met 64-hex token');

  await page.waitForSelector('#vs-inhoud:not(.hidden)', { timeout: 10000 });
  const prijsText = await page.locator('#vs-prijs').textContent();
  const setupText = await page.locator('#vs-setup').textContent();
  assert.match(prijsText, new RegExp(euro(EXPECTED_PRIJS_CENT).replace('€', '€\\s*')), `A: maandprijs getoond (${prijsText})`);
  assert.match(prijsText, /per maand/, 'A: maandprijs vermeldt "per maand"');
  assert.match(setupText, new RegExp(euro(EXPECTED_SETUP_CENT).replace('€', '€\\s*')), `A: setup-fee getoond (${setupText})`);
  assert.match(setupText, /eenmalige inrichting/, 'A: setup-fee vermeldt "eenmalige inrichting"');

  assert.equal(await page.locator('#vs-roi').isVisible(), true, 'A: ROI-blok zichtbaar bij bruikbare invoer');
  const roiText = await page.locator('#vs-roi-tekst').textContent();
  assert.match(roiText, new RegExp(euro(EXPECTED_ROI.verliesPerMaandCent).replace('€', '€\\s*')), `A: ROI-bedrag klopt met berekenRoi() (${roiText})`);

  await ctx.close();
  console.log('  ✓ A: wizard (voice-agent, ingevulde ROI-velden) -> voorstel met correcte prijs, setup-fee en ROI-blok');
}

// ── Scenario B: onbekend token onthult niets ────────────────────────────────
async function scenarioOnbekendToken(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Zelfde antwoord als de worker geeft voor een onbekend/verlopen token
  // (src/worker.js: `if (!voorstel) return jsonResponse({ ok:false, ... }, 404)`)
  // — geen onderscheid tussen "nooit bestaan" en "verlopen".
  await page.route('**/api/voorstel*', (route) => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, message: 'Dit voorstel is niet (meer) beschikbaar.' }),
  }));

  const fakeToken = 'a'.repeat(64);
  await page.goto(`${BASE}/start/voorstel/?t=${fakeToken}`);

  await page.waitForSelector('#vs-fout:not(.hidden)', { timeout: 10000 });
  assert.equal(await page.locator('#vs-inhoud').isVisible(), false, 'B: #vs-inhoud blijft verborgen');
  assert.equal(await page.locator('#vs-laden').isVisible(), false, 'B: laadstatus is weg');

  // NB: page.content() of de volledige zichtbare body-tekst checken op "geen
  // €" zou hier vals-positief falen — BaseLayout's nav/footer toont overal op
  // de site marketing-prijzen ("v.a. €2.950 setup", enz.), los van dit token.
  // De relevante toets is dat de VOORSTEL-SPECIFIEKE elementen zelf nooit
  // gevuld worden — #vs-inhoud is al gecontroleerd (verborgen); hier expliciet
  // dat de velden die laad() zou vullen bij een geldig token leeg blijven.
  for (const id of ['vs-prijs', 'vs-setup', 'vs-pakket', 'vs-kop', 'vs-tekst']) {
    const text = (await page.locator('#' + id).textContent()) || '';
    assert.equal(text.trim(), '', `B: #${id} blijft leeg bij een onbekend token (was: "${text}")`);
  }

  const foutKop = await page.locator('#vs-fout-kop').textContent();
  assert.match(foutKop, /niet meer beschikbaar/i, 'B: nette, generieke foutmelding (geen technische details)');

  await ctx.close();
  console.log('  ✓ B: onbekend token -> nette foutstatus, geen inhoud, geen productdata gelekt');
}

async function main() {
  const server = await startStaticServer();
  const browser = await chromium.launch();
  let failed = false;
  try {
    console.log('koopweg.playwright.mjs — scenario\'s:');
    console.log(`  (afgeleid uit src/data/pricing.ts: prijs=${euro(EXPECTED_PRIJS_CENT)}/mnd, setup=${euro(EXPECTED_SETUP_CENT)})`);
    await scenarioWizardNaarVoorstel(browser);
    await scenarioOnbekendToken(browser);
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
