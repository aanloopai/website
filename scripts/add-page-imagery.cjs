#!/usr/bin/env node
// One-shot helper: integrate /pages/<x>.jpg into 16 page hero blocks.
// Idempotent: skips files where Astro Image import is already present.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'src/pages');

// targets[i] = { file: relative-from-pages, img: filename in pages/, alt: descriptive alt, depth: 1|2 }
// depth=1: src/pages/foo.astro -> ../assets/...
// depth=2: src/pages/diensten/foo.astro -> ../../assets/...
const targets = [
  // Depth 1 (src/pages/*)
  { file: 'contact.astro',                                   img: 'contact.jpg',         alt: 'Aanloop AI team aan tafel met laptops — neem contact op met onze AI-experts in Rotterdam', depth: 1 },
  { file: 'werkwijze.astro',                                 img: 'werkwijze.jpg',       alt: 'Team brainstormt rond whiteboard met sticky notes — Aanloop AI werkwijze van adviesgesprek tot live AI-agent', depth: 1 },
  { file: 'cases.astro',                                     img: 'cases.jpg',           alt: 'Zakelijke teampresentatie in vergaderzaal — case studies van Aanloop AI klanten', depth: 1 },
  { file: 'ai-receptionist-nederland.astro',                 img: 'receptionist.jpg',    alt: 'Professional aan het werk met laptop op licht kantoor — AI receptionist voor Nederlandse MKB-bedrijven', depth: 1 },
  // Depth 2 (src/pages/diensten/*)
  { file: 'diensten/index.astro',                            img: 'diensten-index.jpg',  alt: 'Process flow op whiteboard — overzicht van 15 AI-oplossingen voor Nederlandse MKB', depth: 2 },
  { file: 'diensten/audit.astro',                            img: 'audit.jpg',           alt: 'Twee laptops met paperwork analyse — Aanloop AI audit voor Nederlandse MKB-bedrijven', depth: 2 },
  { file: 'diensten/custom.astro',                           img: 'custom.jpg',          alt: 'Code editor op MacBook Pro — custom AI workflows op maat voor uw bedrijf', depth: 2 },
  { file: 'diensten/ai-afspraken-inplannen.astro',           img: 'afspraken.jpg',       alt: 'Maandagenda met koffiebeker — automatisch afspraken inplannen via AI', depth: 2 },
  { file: 'diensten/ai-chatbot-website.astro',               img: 'chatbot.jpg',         alt: 'Modern bureau met laptop en telefoon — AI chatbot voor uw website', depth: 2 },
  { file: 'diensten/ai-document-processing.astro',           img: 'document.jpg',        alt: 'Documenten en koffie op donker bureau — automatische document processing met AI', depth: 2 },
  { file: 'diensten/ai-email-assistent.astro',               img: 'email.jpg',           alt: 'Mail-app icoon met notificatiebadge op smartphone — AI e-mail assistent voor MKB', depth: 2 },
  { file: 'diensten/ai-hr-recruitment.astro',                img: 'hr.jpg',              alt: 'Glimlachende HR-professional in zakelijk kostuum — AI recruitment & HR-screening', depth: 2 },
  { file: 'diensten/ai-klantenservice-omnichannel.astro',    img: 'klantenservice.jpg',  alt: 'Klantenservice-team in vergaderruimte met laptops — AI omnichannel klantenservice', depth: 2 },
  { file: 'diensten/ai-lead-qualification.astro',            img: 'lead.jpg',            alt: 'Laptop met conversie-pagina — AI lead qualification met BANT-model', depth: 2 },
  { file: 'diensten/ai-seo-content-generator.astro',         img: 'seo.jpg',             alt: 'Vulpen schrijft op gelinieerd papier — AI SEO content generator voor Nederlandse MKB', depth: 2 },
  { file: 'diensten/ai-verkoopagent-outbound.astro',         img: 'verkoop.jpg',         alt: 'Zakelijke handdruk in moderne kantooromgeving — AI verkoopagent voor outbound sales', depth: 2 },
];

let updated = 0;
let skipped = 0;
const failed = [];

for (const t of targets) {
  const p = path.join(PAGES, t.file);
  if (!fs.existsSync(p)) { failed.push('MISSING ' + t.file); continue; }

  let src = fs.readFileSync(p, 'utf8');

  if (src.includes("from 'astro:assets'") || src.includes('pages/' + t.img)) {
    skipped++;
    continue;
  }

  const upDots = t.depth === 2 ? '../..' : '..';
  const layoutMatch = t.depth === 2
    ? /^(import BaseLayout from '\.\.\/\.\.\/layouts\/BaseLayout\.astro';)$/m
    : /^(import BaseLayout from '\.\.\/layouts\/BaseLayout\.astro';)$/m;

  if (!layoutMatch.test(src)) { failed.push('NO_IMPORT_LINE ' + t.file); continue; }

  src = src.replace(
    layoutMatch,
    "import { Image } from 'astro:assets';\n$1\nimport pageImage from '" + upDots + "/assets/images/pages/" + t.img + "';"
  );

  // Hero pattern: hero-gradient OR plain border-b section with max-w-3xl content.
  const heroBlockRegex = /(<section class="border-b border-slate-200(?:\s+hero-gradient)?">\s*<div class="container-page py-\d+(?:\s+lg:py-\d+)?">\s*)(<div class="max-w-3xl">[\s\S]*?<\/div>)(\s*<\/div>\s*<\/section>)/;
  const m = src.match(heroBlockRegex);
  if (!m) { failed.push('NO_HERO_PATTERN ' + t.file); continue; }

  const replacement =
    m[1] + '<div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">\n      ' + m[2] +
    '\n      <div class="reveal reveal-delay-2">\n' +
    '        <Image src={pageImage} alt="' + t.alt + '" class="w-full rounded-2xl shadow-xl object-cover aspect-[4/3]" loading="eager" decoding="async" fetchpriority="high" widths={[480, 800, 1200, 1400]} sizes="(min-width: 1024px) 600px, 100vw" format="webp" quality={82} />\n' +
    '      </div>\n      </div>' + m[3];

  src = src.replace(heroBlockRegex, replacement);
  fs.writeFileSync(p, src, 'utf8');
  updated++;
  console.log('updated ' + t.file);
}

console.log('\nResult: updated=' + updated + ' skipped=' + skipped + ' failed=' + failed.length);
if (failed.length) {
  console.log('Failed:');
  failed.forEach(function (f) { console.log('  ' + f); });
  process.exit(1);
}
