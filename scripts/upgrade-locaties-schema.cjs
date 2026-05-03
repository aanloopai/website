// Sprint E.3 — locaties schema upgrade.
// Idempotent script (zoals scripts/cleanup-kennisbank-meta.cjs en scripts/add-sector-imagery.cjs):
// - ProfessionalService -> LocalBusiness (P1 GEO-audit follow-up)
// - voegt telephone toe waar ontbreekt
// - voegt openingHoursSpecification toe waar ontbreekt
// Na uitvoeren: handmatig `npm run build` + git diff inspectie + commit.

const fs = require('fs');
const path = require('path');

const LOC_DIR = path.join(__dirname, '..', 'src', 'pages', 'locaties');
const PHONE = '+31624741597';
const HOURS_FIELD = `  openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' },\n`;
const PHONE_FIELD = `  telephone: '${PHONE}',\n`;

function processFile(filePath) {
  const fileName = path.basename(filePath);
  if (fileName === 'index.astro') return { skipped: 'index page (separate schema)' };

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const changes = [];

  // 1. ProfessionalService -> LocalBusiness
  if (content.includes("'@type': 'ProfessionalService'")) {
    content = content.replace(/'@type': 'ProfessionalService'/g, "'@type': 'LocalBusiness'");
    changes.push('@type->LocalBusiness');
  }

  const hasTelephone = /\btelephone:\s*'/.test(content);
  const hasHours = /\bopeningHoursSpecification:/.test(content);

  // 2 + 3. Insert telephone and/or openingHoursSpecification after areaServed line.
  // CRLF-tolerant via \r?\n. Detect EOL per file zodat de inserted lines passen.
  if (!hasTelephone || !hasHours) {
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const phoneLine = `  telephone: '${PHONE}',${eol}`;
    const hoursLine = `  openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' },${eol}`;

    const areaServedRegex = /(areaServed: \{[^}]+\},\r?\n)/;
    if (areaServedRegex.test(content)) {
      content = content.replace(areaServedRegex, (match) => {
        let insert = '';
        if (!hasTelephone) {
          insert += phoneLine;
          changes.push('+telephone');
        }
        if (!hasHours) {
          insert += hoursLine;
          changes.push('+openingHoursSpecification');
        }
        return match + insert;
      });
    } else {
      // Geen areaServed lijn — laat tel/hours over voor handmatige edit, maar @type swap bewaren we wel.
      changes.push('(skipped tel/hours — areaServed not found, manual fix needed)');
    }
  }

  if (content === original) return { unchanged: true };

  fs.writeFileSync(filePath, content);
  return { changes };
}

function main() {
  const files = fs.readdirSync(LOC_DIR)
    .filter(f => f.endsWith('.astro'))
    .sort();

  console.log(`Processing ${files.length} locatie pages in ${LOC_DIR}\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  let skipped = 0;

  for (const file of files) {
    const fp = path.join(LOC_DIR, file);
    const result = processFile(fp);
    if (result.error) {
      console.log(`  x ${file}  ERROR: ${result.error}`);
      errors++;
    } else if (result.skipped) {
      console.log(`  - ${file}  skipped (${result.skipped})`);
      skipped++;
    } else if (result.unchanged) {
      console.log(`  = ${file}  no changes needed`);
      unchanged++;
    } else {
      console.log(`  + ${file}  ${result.changes.join(', ')}`);
      updated++;
    }
  }

  console.log(`\nSummary: ${updated} updated, ${unchanged} unchanged, ${skipped} skipped, ${errors} errors`);
  process.exit(errors > 0 ? 1 : 0);
}

if (require.main === module) main();
