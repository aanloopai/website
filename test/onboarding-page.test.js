// Statische assertions op de bronsource van /portal/onboarding — zelfde stijl
// als test/base-layout-analytics.test.js: leest het echte .astro-bestand
// (geen herschreven kopie) en checkt op aanwezigheid van de vereiste
// strings/structuur (task-8-brief.md). Geen headless-render nodig: dit is een
// statische Astro-pagina met een client-side inline wizard-script.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(__dirname, '../src/pages/portal/onboarding.astro');
const layoutPath = path.join(__dirname, '../src/layouts/PortalLayout.astro');

const pageSrc = fs.readFileSync(pagePath, 'utf8');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

describe('portal/onboarding.astro — post-pay onboardingwizard', () => {
  it('rendert binnen PortalLayout, die zelf de noindex-meta zet', () => {
    expect(pageSrc).toMatch(/import PortalLayout from ['"]\.\.\/\.\.\/layouts\/PortalLayout\.astro['"]/);
    expect(pageSrc).toMatch(/<PortalLayout\b/);
    expect(layoutSrc).toMatch(/<meta name="robots" content="noindex/);
  });

  it('fetcht de onboarding-state bij /api/portal/onboarding', () => {
    expect(pageSrc).toMatch(/fetch\(['"`]\/api\/portal\/onboarding\?order=/);
  });

  it('post per stap genest terug naar /api/portal/onboarding', () => {
    // Zelfde endpoint als de GET hierboven — de POST-aanroep zit los in de
    // fetch-call verderop in het script, met order_id + answers in de body.
    const postCalls = pageSrc.match(/fetch\(['"`]\/api\/portal\/onboarding['"`]/g) || [];
    expect(postCalls.length).toBeGreaterThan(0);
    expect(pageSrc).toMatch(/order_id:\s*orderId/);
    expect(pageSrc).toMatch(/answers:\s*stepAnswers/);
  });

  it('bevat de agenda-koppelknop die naar /api/portal/onboarding/agenda/initiate wijst', () => {
    expect(pageSrc).toContain('/api/portal/onboarding/agenda/initiate');
    expect(pageSrc).toMatch(/Koppel Google Agenda/);
  });

  it('toont een voortgangsindicator gebaseerd op progressPct', () => {
    expect(pageSrc).toMatch(/progressPct/);
    expect(pageSrc).toMatch(/id="ow-progress-bar"/);
    expect(pageSrc).toMatch(/id="ow-progress-pct"/);
  });

  it('toont het "dienst is live"-successcherm bij {actief:true}', () => {
    expect(pageSrc).toMatch(/res\.j\.actief/);
    expect(pageSrc).toMatch(/id="ow-done"/);
    expect(pageSrc).toMatch(/Uw dienst is live/);
  });

  it('bevat de AI-disclosure (EU AI Act art. 50) + KvK 88606902', () => {
    expect(pageSrc).toMatch(/AI-assistent \(geen mens\)/);
    expect(pageSrc).toMatch(/EU AI Act/);
    expect(pageSrc).toMatch(/art\. 50/);
    expect(pageSrc).toContain('88606902');
  });

  it('bevat geen "marco" in zichtbare tekst', () => {
    expect(pageSrc.toLowerCase()).not.toContain('marco');
  });

  it('hergebruikt de gedeelde veldrenderer (geen gedupliceerde fieldHtml/faqRow-logica)', () => {
    expect(pageSrc).toMatch(/from ['"]\.\.\/\.\.\/lib\/portal-intake-fields\.js['"]/);
    expect(pageSrc).not.toMatch(/function fieldHtml/);
  });
});
