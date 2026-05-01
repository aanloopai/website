// Per-page OG-image generator for Aanloop AI
//
// USAGE:
//   1. Install Playwright once:    npm install --save-dev playwright
//   2. Install browser binaries:   npx playwright install chromium
//   3. Run script:                  node scripts/generate-og-images.js
//   4. Output:                      public/og/<slug>.png  (1200x630 each)
//   5. Update BaseLayout to use per-page OG-images by deriving slug from path
//
// The HTML-template uses Aanloop AI brand colors (theme NIET wijzigen — same as site).

const fs = require('fs');
const path = require('path');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  console.error('\n[ERROR] Playwright not installed.');
  console.error('Run first:  npm install --save-dev playwright');
  console.error('Then:       npx playwright install chromium');
  console.error('Then re-run this script.\n');
  process.exit(1);
}

const SITE = 'https://aanloopai.nl';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'og');

const pages = [
  { slug: 'home', title: 'Aanloop AI', subtitle: 'AI Bureau Nederland voor MKB', label: 'AI agents · Voice AI · Workflow automation' },
  { slug: 'marco', title: 'Marco', subtitle: 'AI Receptionist 24/7', label: 'Vanaf 297 euro per maand · Live in 7 werkdagen' },
  { slug: 'emma', title: 'Emma', subtitle: 'WhatsApp AI Bot', label: 'Vanaf 197 euro per maand · Naadloze handover' },
  { slug: 'ai-receptionist-nederland', title: 'AI Receptionist Nederland', subtitle: 'Volledige Gids voor MKB', label: 'Pillar-gids · Sectorvoorbeelden · Vergelijking' },
  { slug: 'ai-roi-calculator', title: 'AI ROI Calculator', subtitle: 'Bereken uw besparing', label: 'Sector-benchmarks · 80+ klantdata · Gratis' },
  { slug: 'no-show-calculator', title: 'No-show Calculator', subtitle: 'Bereken uw verlies', label: 'Tot 70% no-show reductie met AI' },
  { slug: 'avg-checklist', title: '25-punts AVG-checklist', subtitle: 'AI compliance voor MKB', label: 'CC-BY 4.0 · Printbaar · Gratis' },
  { slug: 'kennisbank', title: 'Aanloop AI Kennisbank', subtitle: '54 gidsen voor MKB', label: 'AI agents · Workflow · Compliance · Sectoren' },
  { slug: 'glossarium', title: 'AI Begrippenlijst', subtitle: '40+ termen voor MKB', label: 'Van AI agent tot vector database' },
  { slug: 'locaties', title: '18 stadspagina\'s', subtitle: 'Aanloop AI in heel Nederland', label: 'Amsterdam · Rotterdam · Utrecht · Eindhoven · 14 meer' },
];

const htmlTemplate = ({ title, subtitle, label }) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body { margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
.card { width: 1200px; height: 630px; background: linear-gradient(135deg, #0B1120 0%, #1e293b 100%); color: #F8FAFC; padding: 80px; box-sizing: border-box; position: relative; overflow: hidden; }
.accent { position: absolute; top: 80px; left: 80px; display: flex; gap: 6px; }
.accent span { display: block; width: 10px; height: 40px; background: linear-gradient(180deg, #6366F1, #8B5CF6); border-radius: 2px; }
.accent span:nth-child(2) { background: linear-gradient(180deg, #8B5CF6, #EC4899); }
.accent span:nth-child(3) { background: linear-gradient(180deg, #EC4899, #F59E0B); }
.accent span:nth-child(4) { background: linear-gradient(180deg, #F59E0B, #10B981); }
.label { position: absolute; top: 80px; right: 80px; font-size: 18px; color: #94A3B8; letter-spacing: 0.1em; text-transform: uppercase; }
.title-block { position: absolute; bottom: 140px; left: 80px; right: 80px; }
h1 { font-size: 84px; font-weight: 800; line-height: 1; margin: 0 0 24px 0; letter-spacing: -0.02em; }
h2 { font-size: 42px; font-weight: 600; color: #CBD5E1; margin: 0 0 32px 0; letter-spacing: -0.01em; }
.footer-label { font-size: 22px; color: #94A3B8; }
.brand { position: absolute; bottom: 60px; left: 80px; font-size: 28px; font-weight: 700; color: #F8FAFC; letter-spacing: -0.01em; }
.brand-domain { position: absolute; bottom: 60px; right: 80px; font-size: 20px; color: #94A3B8; }
</style></head><body>
<div class="card">
<div class="accent"><span></span><span></span><span></span><span></span></div>
<div class="label">Aanloop AI</div>
<div class="title-block"><h1>${title}</h1><h2>${subtitle}</h2><p class="footer-label">${label}</p></div>
<div class="brand">Aanloop AI</div>
<div class="brand-domain">aanloopai.nl</div>
</div></body></html>`;

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 } });
  const page = await context.newPage();
  for (const p of pages) {
    const html = htmlTemplate(p);
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, p.slug + '.png'), type: 'png', fullPage: false });
    console.log('[OK] ' + p.slug + '.png — ' + p.title);
  }
  await browser.close();
  console.log('\nDone. ' + pages.length + ' OG-images generated in ' + OUTPUT_DIR);
  console.log('\nNext: update BaseLayout.astro to derive slug from Astro.url.pathname and set ogImage to /og/<slug>.png if file exists, else fallback to /og-image-default.png.');
})();
