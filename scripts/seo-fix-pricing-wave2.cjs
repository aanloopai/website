#!/usr/bin/env node
// Pricing consistency codemod - wave 2.
// Aligns aanvragen.astro checkout, telefoon-assistent.astro, and pedicure pillar
// to canonical prices from /tarieven and /prijzen:
//   Starter: 597/maand monthly, 497/maand jaarlijks (16% korting), 150 gesprekken
//   Groei: 1197/maand monthly, 997/maand jaarlijks, Marco + Emma WhatsApp
//   Emma standalone: 197/maand
//
// Memory rule: forbidden prijzen 297/497/697/797/897 als introductie-monthly.
// Each edit logged. Idempotent.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const edits = [
  // F1-F7 - aanvragen.astro: align checkout to canonical prices (single-line patches for CRLF tolerance)
  {
    file: 'src/pages/aanvragen.astro',
    patches: [
      // Starter — only one price=297 (Groei has price=497 which is canonical-annual, leave it; we change Groei separately)
      [`    price: 297,`, `    price: 597,`, 1],
      [`    annualPrice: 249,`, `    annualPrice: 497,`, 1],
      // Starter "200 gesprekken" -> "150 gesprekken"
      [`'Tot 200 gesprekken/maand', '1 callscript op maat', 'E-mail lead-routering', 'Dashboard + transcripts'`, `'Tot 150 gesprekken/maand', '1 callscript op maat', 'Agenda + e-mail lead-notificatie', 'Dashboard + transcripts'`, 1],
      // Groei: price 497 → 1197 (must come AFTER Starter price change so 297→597 already done; only one price=497 left = Groei)
      [`    price: 497,`, `    price: 1197,`, 1],
      [`    annualPrice: 417,`, `    annualPrice: 997,`, 1],
      // Groei features
      [`'Onbeperkte gesprekken', 'Tot 5 callscripts', 'CRM-integratie + Telegram', 'Prioriteit support < 4 uur'`, `'Onbeperkte gesprekken', 'Tot 3 callscripts', 'Marco + Emma WhatsApp + CRM-integratie', 'Prioriteit support < 4 uur'`, 1],
      // (product label "Marco — AI sekreter" left as-is — same string for both plans, not pricing-critical)
      // JS fallback default monthly price + annual factor
      [
        `parseInt((document.getElementById('order-price') as HTMLElement)?.textContent?.replace('€','') || '497');`,
        `parseInt((document.getElementById('order-price') as HTMLElement)?.textContent?.replace('€','') || '597');`,
        1,
      ],
      [
        `const summaryPriceAnnual = Math.round(summaryPriceMonthly * 0.84);`,
        `const summaryPriceAnnual = Math.round(summaryPriceMonthly * 0.833);`,
        1,
      ],
    ],
  },
  // F8 - telefoon-assistent.astro: align with Marco canonical (same technology, line 33)
  {
    file: 'src/pages/diensten/telefoon-assistent.astro',
    patches: [
      ['vanaf €297/maand, live in 7 dagen.', 'vanaf €597/maand, live in 7 dagen.', 1],
      // Comparison table: 'Vanaf €497' → 'Vanaf €597' (canonical Marco Starter)
      [
        `{ feature: 'Maandelijkse kosten (10 lijnen)', ai: 'Vanaf €497', kpn: '€800-1.500', voicemail: '€20-50', traditional: '€2.000+' },`,
        `{ feature: 'Maandelijkse kosten (10 lijnen)', ai: 'Vanaf €597', kpn: '€800-1.500', voicemail: '€20-50', traditional: '€2.000+' },`,
        1,
      ],
      // FAQ "Wat kost de AI telefoon assistent?" — align fully with canonical Marco pricing
      [
        `'Starter is €497/maand (tot 1.000 gesprekken, 1 IVR-menu, 3 team-routings), Professional €1.297/maand (onbeperkt, 5 menu&apos;s, multi-team, prioriteit support), Enterprise op maat. Setup-fee is €750 (Starter) of €1.500 (Professional) en wordt bij eerste maand gefactureerd.'`,
        `'Starter is €597/maand (tot 150 gesprekken, 1 IVR-menu, 3 team-routings), Groei €1.197/maand (onbeperkt, multi-team, Marco + Emma WhatsApp, prioriteit support), Partner op maat. Setup-fee is €495 (Starter) of €795 (Groei) — zelfde tarieven als /tarieven Marco-pakketten omdat het dezelfde technologie is.'`,
        1,
      ],
    ],
  },
  // F9-F10 - pedicure pillar: 297-597 -> 197-597 (Emma standalone naar Marco Starter)
  {
    file: 'src/pages/kennisbank/ai-voor-pedicure-praktijk-nederland-2026.astro',
    patches: [
      [
        `'€297-€597/mnd Marco/Emma solo-pakket'`,
        `'€197-€597/mnd Emma standalone tot Marco Starter'`,
        1,
      ],
      [
        'Met €297-€597 per maand investering in Marco/Emma solo-pakket',
        'Met €197-€597 per maand investering in Emma standalone tot Marco Starter',
        1,
      ],
    ],
  },
];

let totalChanges = 0;
let totalErrors = 0;

for (const { file, patches } of edits) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING: ${file}`);
    totalErrors++;
    continue;
  }
  let src = fs.readFileSync(filePath, 'utf8');
  let fileChanges = 0;
  for (const [find, replace, expectedCount] of patches) {
    const occurrences = src.split(find).length - 1;
    if (occurrences === 0) {
      console.warn(`  [${file}] NOT FOUND (or already applied): ${find.slice(0, 70).replace(/\n/g, '\\n')}...`);
      continue;
    }
    if (expectedCount === 1 && occurrences > 1) {
      console.warn(`  [${file}] AMBIGUOUS (${occurrences} matches): ${find.slice(0, 70).replace(/\n/g, '\\n')}...`);
      continue;
    }
    src = src.split(find).join(replace);
    fileChanges += occurrences;
    console.log(`  [${file}] ${occurrences}x ${find.slice(0, 70).replace(/\n/g, '\\n')}...`);
  }
  if (fileChanges > 0) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`OK ${file}: ${fileChanges} change(s)`);
    totalChanges += fileChanges;
  } else {
    console.log(`-- ${file}: no changes (idempotent)`);
  }
}

console.log(`\nTotal: ${totalChanges} changes, ${totalErrors} errors`);
process.exit(totalErrors > 0 ? 1 : 0);
