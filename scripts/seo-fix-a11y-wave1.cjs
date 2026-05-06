#!/usr/bin/env node
// One-shot a11y codemod - wave 1.
// Fixes PSI-detected color-contrast, ARIA, button-name, and heading-order
// issues across Header/Footer/Hero/aanvragen/contact pages.
//
// Each edit is logged. Idempotent: running twice is a no-op.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const edits = [
  // F2 - Header.astro: drop menu/menuitem ARIA roles, switch aria-haspopup
  {
    file: 'src/components/Header.astro',
    patches: [
      ['aria-haspopup="menu"', 'aria-haspopup="true"', 'all'],
      [' role="menu" aria-label="Diensten submenu"', ' aria-label="Diensten submenu"', 1],
      [' role="menu" aria-label="Sectoren submenu"', ' aria-label="Sectoren submenu"', 1],
      [' role="menu" aria-label="Kennisbank submenu"', ' aria-label="Kennisbank submenu"', 1],
      [' role="menu" aria-label="Over submenu"', ' aria-label="Over submenu"', 1],
      ['<a href={item.href} class="megamenu-link group" role="menuitem">', '<a href={item.href} class="megamenu-link group">', 1],
      ['<a href={s.href} class="sector-tile group" role="menuitem">', '<a href={s.href} class="sector-tile group">', 1],
      ['<li><a href={item.href} class="megamenu-link-compact" role="menuitem">{item.label}</a></li>', '<li><a href={item.href} class="megamenu-link-compact">{item.label}</a></li>', 1],
      ['<a href={item.href} class="block px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group" role="menuitem">', '<a href={item.href} class="block px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">', 1],
      ['button[aria-haspopup="menu"]', 'button[aria-haspopup="true"]', 1],
    ],
  },
  // F3 - aanvragen.astro: text-slate-400 -> text-slate-500 in checkout chrome,
  // add aria-label to billing toggle button, promote "UW BESTELLING" p -> h2
  {
    file: 'src/pages/aanvragen.astro',
    patches: [
      [`'text-xs hidden sm:block', i === 0 ? 'font-medium text-navy' : 'text-slate-400'`, `'text-xs hidden sm:block', i === 0 ? 'font-medium text-navy' : 'text-slate-500'`, 1],
      ['<div class="text-[11px] text-slate-400 mt-0.5">', '<div class="text-[11px] text-slate-500 mt-0.5">', 'all'],
      ['<p class="text-[11px] text-slate-400 mt-1">', '<p class="text-[11px] text-slate-500 mt-1">', 'all'],
      ['<p class="text-xs font-semibold tracking-[0.12em] uppercase text-slate-400 mb-4">', '<h2 class="text-xs font-semibold tracking-[0.12em] uppercase text-slate-500 mb-4">', 1],
      ['<p class="text-xs text-slate-400">', '<p class="text-xs text-slate-500">', 'all'],
      ['<span id="billing-annual-label" class="text-slate-400 text-xs">', '<span id="billing-annual-label" class="text-slate-500 text-xs">', 1],
      ['class="text-xs text-slate-400 mt-1"', 'class="text-xs text-slate-500 mt-1"', 'all'],
      ['class="text-[11px] text-slate-400"', 'class="text-[11px] text-slate-500"', 'all'],
      [
        '<button id="order-billing-toggle" class="relative w-10 h-5 rounded-full bg-slate-200 transition-colors">',
        '<button id="order-billing-toggle" type="button" class="relative w-10 h-5 rounded-full bg-slate-200 transition-colors" aria-label="Schakel tussen maandelijkse en jaarlijkse facturering">',
        1,
      ],
    ],
  },
  // F4/F5 - contact.astro: optioneel labels + werkdagen amber
  {
    file: 'src/pages/contact.astro',
    patches: [
      ['<span class="text-slate-400 font-normal">(optioneel)</span>', '<span class="text-slate-500 font-normal">(optioneel)</span>', 'all'],
      ['<span class="font-medium text-brand-amber">', '<span class="font-medium text-amber-700">', 'all'],
    ],
  },
  // F6 - Footer.astro: h3 headings on midnight bg need text-slate-400 (5.7:1)
  // instead of text-slate-500 (3.95:1)
  {
    file: 'src/components/Footer.astro',
    patches: [
      ['class="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500"', 'class="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400"', 'all'],
      ['class="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500 mt-8"', 'class="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mt-8"', 'all'],
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
  for (const [find, replace, mode] of patches) {
    const occurrences = src.split(find).length - 1;
    if (occurrences === 0) {
      console.warn(`  [${file}] NOT FOUND (or already applied): ${find.slice(0, 60)}...`);
      continue;
    }
    if (mode === 1 && occurrences > 1) {
      console.warn(`  [${file}] AMBIGUOUS (${occurrences} matches, expected 1): ${find.slice(0, 60)}...`);
      continue;
    }
    src = src.split(find).join(replace);
    fileChanges += occurrences;
    console.log(`  [${file}] ${occurrences}x ${find.slice(0, 70)}...`);
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
