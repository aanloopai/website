// Punt 4 (eindreview): /start/voorstel/?t=<token> draait de gedeelde
// analytics uit BaseLayout, die de volledige URL (incl. het voorstel-token)
// als paginalocatie meestuurt aan GA4. Dat token is een capability die 14
// dagen geldig is (spec §7 C2): wie hem heeft kan het voorstel lezen én een
// mail naar het adres van de klant laten sturen. Dit legt vast dat de
// GA4-config-call het token NOOIT als onderdeel van page_location meestuurt.
//
// De test evalueert het echte inline <script> uit BaseLayout.astro (niet een
// herschreven kopie) tegen een minimale window/document/location-mock, zodat
// dit een regressietest is op de daadwerkelijke runtime-code, niet op een
// tekstpatroon.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const layoutPath = path.join(__dirname, '../src/layouts/BaseLayout.astro');

function extractConsentScript() {
  const src = fs.readFileSync(layoutPath, 'utf8');
  const startMarker = '<!-- Google Consent Mode v2';
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) throw new Error('Consent Mode-script niet gevonden in BaseLayout.astro');
  const scriptOpenIdx = src.indexOf('<script is:inline>', startIdx);
  const scriptCloseIdx = src.indexOf('</script>', scriptOpenIdx);
  if (scriptOpenIdx === -1 || scriptCloseIdx === -1) throw new Error('Kon het <script>-blok niet afbakenen');
  return src.slice(scriptOpenIdx + '<script is:inline>'.length, scriptCloseIdx);
}

// Voert het geëxtraheerde script uit tegen een minimale browser-mock en geeft
// alle gtag()-aanroepen terug als array van argument-lijsten.
//
// De script-body verwijst zowel naar `window.dataLayer` als naar de kale
// identifier `dataLayer` (`function gtag(){dataLayer.push(arguments);}`) —
// exact zoals in een echte browser, waar `window` het globale object IS en
// beide dus dezelfde binding zijn. In Node bestaat die gelijkstelling niet,
// dus geven we bewust dezelfde array mee als zowel `window.dataLayer` als de
// losse `dataLayer`-parameter.
function runScript(href) {
  const scriptSrc = extractConsentScript();
  const sharedDataLayer = [];
  const fakeWindow = { dataLayer: sharedDataLayer };
  const fakeDocument = { addEventListener: () => {} };
  const fakeLocalStorage = { getItem: () => null };
  const fakeLocation = { href };

  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'document', 'localStorage', 'location', 'dataLayer', scriptSrc);
  fn(fakeWindow, fakeDocument, fakeLocalStorage, fakeLocation, sharedDataLayer);
  return sharedDataLayer.map((argsObj) => Array.from(argsObj));
}

describe('BaseLayout — GA4-config lekt het voorstel-token niet in page_location', () => {
  it('stript het "t"-queryparam uit page_location dat naar gtag config gaat', () => {
    const pushes = runScript('https://aanloopai.nl/start/voorstel/?t=' + 'a'.repeat(64));
    const configCall = pushes.find((args) => args[0] === 'config');
    expect(configCall).toBeTruthy();
    const params = configCall[2];
    expect(params).toBeTruthy();
    expect(typeof params.page_location).toBe('string');
    expect(params.page_location).not.toMatch(/[?&]t=/);
    // Het pad zelf blijft intact — alleen het token verdwijnt.
    expect(params.page_location).toContain('/start/voorstel/');
  });

  it('laat andere querystrings (bv. UTM-parameters) intact', () => {
    const pushes = runScript('https://aanloopai.nl/tarieven/?utm_source=google&utm_campaign=test');
    const configCall = pushes.find((args) => args[0] === 'config');
    const params = configCall[2];
    expect(params.page_location).toContain('utm_source=google');
    expect(params.page_location).toContain('utm_campaign=test');
  });

  it('werkt ook zonder querystring (geen kapotte URL)', () => {
    const pushes = runScript('https://aanloopai.nl/');
    const configCall = pushes.find((args) => args[0] === 'config');
    const params = configCall[2];
    expect(params.page_location).toBe('https://aanloopai.nl/');
  });
});
