#!/usr/bin/env node
// Q2.H Groep 3 cross-link codemod (sessie-22).
// Inserts a "Lees ook" cross-link section before </BaseLayout> in source pages,
// pointing to under-linked kennisbank articles + orphan root-level pages.
// Idempotent via SENTINEL HTML comment.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SENTINEL = '<!-- xref-orphan-fix-2026-05-07 -->';

// Mappings: source-page (relative to src/pages/) -> array of {href, title} cross-link entries.
// Targets are kennisbank/* slugs OR absolute root paths starting with '/'.
const MAP = {
  'sectoren/zakelijk.astro': [
    { href: '/kennisbank/ai-cashflow-prognose-finance-mkb-nederland-2026/', title: 'AI cashflow-prognose en finance-forecasting voor MKB Nederland' },
    { href: '/kennisbank/ai-agent-google-workspace-gmail-mkb-nederland/', title: 'AI agent voor Google Workspace en Gmail (MKB Nederland)' },
    { href: '/kennisbank/ai-lead-scoring-b2b-sales-mkb-nederland-2026/', title: 'AI lead scoring en B2B-sales-funnel voor MKB' },
    { href: '/kennisbank/ai-servicedesk-it-helpdesk-mkb-nederland-2026/', title: 'AI servicedesk en IT-helpdesk automatisering' },
    { href: '/kennisbank/ai-voor-rijschool-lesplanning-nederland/', title: 'AI voor rijschool: lesplanning en lead-routing' },
    { href: '/kennisbank/ai-voor-schoonmaakbedrijf-nederland-2026/', title: 'AI voor schoonmaakbedrijven: planning en klantcontact' },
    { href: '/kennisbank/ai-voor-sportclub-vereniging-ledenbeheer-nederland/', title: 'AI voor sportclubs en verenigingen: ledenbeheer' },
    { href: '/kennisbank/ai-voor-tuinbouw-hoveniers-nederland-2026/', title: 'AI voor tuinbouw en hoveniers: planning en offertes' },
    { href: '/kennisbank/ai-agency-kiezen-mkb-nederland-2026/', title: 'AI Agency Kiezen Nederland 2026 (12 selectiecriteria)' },
  ],
  'sectoren/zorg.astro': [
    { href: '/kennisbank/ai-voor-fysiotherapiepraktijk-nederland-2026/', title: 'AI voor fysiotherapiepraktijk: KNGF-bewust en agenda 24/7' },
    { href: '/kennisbank/ai-voor-paardenarts-nederland-2026/', title: 'AI voor paardenarts: KNMvD, koliek-spoed 24/7' },
    { href: '/kennisbank/ai-voor-pedicure-praktijk-nederland-2026/', title: 'AI voor pedicure-praktijk: ProVoet-bewust, no-show 75% omlaag' },
  ],
  'sectoren/horeca.astro': [
    { href: '/kennisbank/ai-voor-reisbureau-touroperator-nederland/', title: 'AI voor reisbureau en touroperator: 24/7 boekingen' },
    { href: '/kennisbank/ai-voor-schoonheidssalon-kapsalon-nederland/', title: 'AI voor schoonheidssalon en kapsalon: agenda + recall' },
  ],
  'sectoren/accountancy.astro': [
    { href: '/kennisbank/ai-cashflow-prognose-finance-mkb-nederland-2026/', title: 'AI cashflow-prognose en finance-forecasting voor MKB Nederland' },
  ],
  'sectoren/ai-voor-advocaten.astro': [
    { href: '/kennisbank/ai-voor-advocatenkantoor-nederland-2026/', title: 'AI voor advocatenkantoor: NOvA-bewust en beroepsgeheim-respecterend' },
  ],
  'sectoren/vastgoed.astro': [
    { href: '/kennisbank/ai-voor-woningcorporatie-huurdersservice-nederland/', title: 'AI voor woningcorporatie: huurdersservice 24/7' },
  ],
  'sectoren/detailhandel.astro': [
    { href: '/ai-voor-ecommerce-webshops-nederland/', title: 'AI voor E-commerce en Webshops Nederland' },
  ],
  'sectoren/ai-voor-webshops.astro': [
    { href: '/ai-voor-ecommerce-webshops-nederland/', title: 'AI voor E-commerce en Webshops Nederland' },
  ],
  'diensten/marco.astro': [
    { href: '/kennisbank/ai-agent-google-workspace-gmail-mkb-nederland/', title: 'AI agent voor Google Workspace en Gmail (MKB Nederland)' },
    { href: '/kennisbank/ai-servicedesk-it-helpdesk-mkb-nederland-2026/', title: 'AI servicedesk en IT-helpdesk automatisering' },
  ],
  'diensten/ai-hr-recruitment.astro': [
    { href: '/kennisbank/ai-hr-sollicitatie-screening-avg-eu-ai-act/', title: 'AI in HR sollicitatie-screening: AVG en EU AI Act' },
  ],
  'diensten/ai-lead-qualification.astro': [
    { href: '/kennisbank/ai-lead-scoring-b2b-sales-mkb-nederland-2026/', title: 'AI lead scoring en B2B-sales-funnel voor MKB' },
  ],
  'over.astro': [
    { href: '/kennisbank/ai-agency-kiezen-mkb-nederland-2026/', title: 'AI Agency Kiezen Nederland 2026 (12 selectiecriteria)' },
  ],
  'index.astro': [
    { href: '/kennisbank/ai-agency-kiezen-mkb-nederland-2026/', title: 'AI Agency Kiezen Nederland 2026 (12 selectiecriteria)' },
    { href: '/enterprise/', title: 'AI op enterprise schaal: zonder compromissen' },
  ],
};

function buildCrossLinkSection(entries) {
  const items = entries
    .map(
      (e) =>
        `        <li><a href="${e.href}" class="text-brand-blue hover:text-brand-blue/80 underline-offset-4 hover:underline">${e.title}</a></li>`,
    )
    .join('\n');
  return `${SENTINEL}
<section class="border-t border-pearl/10 bg-midnight/60 py-12" aria-labelledby="xref-orphan-heading">
  <div class="mx-auto max-w-6xl px-6">
    <h2 id="xref-orphan-heading" class="text-xl font-semibold text-pearl mb-6">Lees ook</h2>
    <ul class="grid gap-3 sm:grid-cols-2 text-sm text-pearl/80">
${items}
    </ul>
  </div>
</section>
<!-- /xref-orphan-fix-2026-05-07 -->`;
}

let changed = 0;
let skipped = 0;
let missing = 0;
const skippedFiles = [];
const missingFiles = [];

for (const [relPath, entries] of Object.entries(MAP)) {
  const fp = path.join(ROOT, 'src', 'pages', relPath);
  if (!fs.existsSync(fp)) {
    missing++;
    missingFiles.push(relPath);
    console.warn(`MISSING: ${relPath}`);
    continue;
  }
  const src = fs.readFileSync(fp, 'utf8');
  if (src.includes(SENTINEL)) {
    skipped++;
    skippedFiles.push(relPath);
    continue;
  }
  const block = buildCrossLinkSection(entries);
  let out;
  if (src.includes('</BaseLayout>')) {
    out = src.replace('</BaseLayout>', `${block}\n</BaseLayout>`);
  } else if (src.includes('</Layout>')) {
    out = src.replace('</Layout>', `${block}\n</Layout>`);
  } else {
    console.warn(`NO-LAYOUT-CLOSE: ${relPath}`);
    missing++;
    missingFiles.push(relPath);
    continue;
  }
  fs.writeFileSync(fp, out);
  changed++;
  console.log(`+ ${relPath} -> ${entries.length} cross-link${entries.length !== 1 ? 's' : ''}`);
}

console.log(`\nResult: ${changed} updated, ${skipped} skipped (sentinel-present), ${missing} missing/no-layout`);
if (skippedFiles.length) console.log('Skipped (idempotent):', skippedFiles.join(', '));
if (missingFiles.length) console.log('Missing/no-layout:', missingFiles.join(', '));
