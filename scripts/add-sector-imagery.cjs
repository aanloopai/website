#!/usr/bin/env node
// One-shot helper: integrate /sectoren/<x>.jpg into 9 sector hero blocks.
// Idempotent: skips files where Astro Image import is already present.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SECTOREN = path.join(ROOT, 'src/pages/sectoren');

const targets = [
  { file: 'vastgoed.astro',          img: 'vastgoed.jpg',     alt: 'Modern Nederlands woninginterieur — AI voor makelaars en vastgoedkantoren' },
  { file: 'detailhandel.astro',      img: 'detailhandel.jpg', alt: 'Modern Nederlands supermarkt-/retail-interieur — AI voor detailhandel en e-commerce' },
  { file: 'zakelijk.astro',          img: 'zakelijk.jpg',     alt: 'Zakelijke teampresentatie — AI voor adviesbureaus en consultancy' },
  { file: 'zorg.astro',              img: 'zorg.jpg',         alt: 'Zorgprofessional met smartphone — AI voor zorgverleners NEN 7510 compliant' },
  { file: 'accountancy.astro',       img: 'accountancy.jpg',  alt: 'Accountant aan bureau met financiele documenten — AI voor accountantskantoren' },
  { file: 'bouw.astro',              img: 'bouw.jpg',         alt: 'Bouwprofessional bekijkt blauwdrukken — AI voor bouw- en installatiebedrijven' },
  { file: 'ai-voor-advocaten.astro', img: 'advocaten.jpg',    alt: 'Vrouwe Justitia statue — AI voor advocatenkantoren en juridische dienstverlening' },
  { file: 'ai-voor-zzp.astro',       img: 'zzp.jpg',          alt: 'ZZP-professional werkt op laptop — AI voor freelancers en zelfstandigen' },
  { file: 'ai-voor-webshops.astro',  img: 'webshops.jpg',     alt: 'Online shopping met laptop en creditcard — AI voor webshops en e-commerce' },
];

let updated = 0;
let skipped = 0;
const failed = [];

for (const t of targets) {
  const p = path.join(SECTOREN, t.file);
  if (!fs.existsSync(p)) { failed.push('MISSING ' + t.file); continue; }

  let src = fs.readFileSync(p, 'utf8');

  // Idempotency check
  if (src.includes("from 'astro:assets'") || src.includes('sectoren/' + t.img)) {
    skipped++;
    continue;
  }

  // 1) Inject imports under the first `import BaseLayout` line
  const importRegex = /^(import BaseLayout from '\.\.\/\.\.\/layouts\/BaseLayout\.astro';)$/m;
  if (!importRegex.test(src)) { failed.push('NO_IMPORT_LINE ' + t.file); continue; }
  src = src.replace(
    importRegex,
    "import { Image } from 'astro:assets';\n$1\nimport sectorImage from '../../assets/images/sectoren/" + t.img + "';"
  );

  // 2) Wrap hero block: <div class="max-w-3xl"> ... </div> just before </div></section>
  // Accept any container-page padding variant (py-16 lg:py-20 / py-16 lg:py-24 / etc.)
  const heroBlockRegex = /(<section class="border-b border-slate-200 hero-gradient">\s*<div class="container-page py-\d+(?: lg:py-\d+)?">\s*)(<div class="max-w-3xl">[\s\S]*?<\/div>)(\s*<\/div>\s*<\/section>)/;
  const m = src.match(heroBlockRegex);
  if (!m) { failed.push('NO_HERO_PATTERN ' + t.file); continue; }

  const replacement =
    m[1] + '<div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">\n      ' + m[2] +
    '\n      <div class="reveal reveal-delay-2">\n' +
    '        <Image src={sectorImage} alt="' + t.alt + '" class="w-full rounded-2xl shadow-xl object-cover aspect-[4/3]" loading="eager" decoding="async" fetchpriority="high" widths={[480, 800, 1200, 1400]} sizes="(min-width: 1024px) 600px, 100vw" format="webp" quality={82} />\n' +
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
