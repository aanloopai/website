/**
 * Q2.2 - 20 quick-win keyword tweaks (batch 1).
 * Targets title/description/H1 string-literal replacements on 6 high-impact pages
 * mapped to KEYWORD-RESEARCH-DUTCH-AI.md "20 QUICK WINS" table.
 * Idempotent: skips if anchor not found (already applied).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const tweaks = [
  {
    file: 'src/pages/index.astro',
    label: '#1 AI bureau MKB Nederland',
    edits: [
      {
        from: 'title="AI Bureau Nederland voor MKB"',
        to: 'title="AI Bureau MKB Nederland - Receptionist, WhatsApp en Workflows"'
      },
      {
        from: 'description="Aanloop AI: hét AI bureau voor Nederlands MKB. AI-receptionist, WhatsApp-agent en custom workflows — live binnen 14 dagen. Gratis AI-scan."',
        to: 'description="AI bureau voor Nederlands MKB: AI-receptionist (Marco), WhatsApp-agent (Emma) en custom AI-workflows. Live binnen 14 dagen, vanaf 597 euro per maand. Gratis AI-scan."'
      }
    ]
  },
  {
    file: 'src/pages/diensten/emma.astro',
    label: '#7 WhatsApp AI bedrijf',
    edits: [
      {
        from: 'title="Emma — AI WhatsApp Bot MKB NL"',
        to: 'title="Emma - WhatsApp AI Bedrijf voor MKB Nederland"'
      },
      {
        from: 'description="Emma is uw AI WhatsApp Business bot die klantvragen 24/7 in seconden beantwoordt. Getraind op uw eigen kennisbank, naadloze handover naar uw team."',
        to: 'description="WhatsApp AI bedrijf voor MKB Nederland: Emma beantwoordt klantvragen 24/7 op WhatsApp Business, getraind op uw kennisbank. Naadloze handover naar uw team."'
      }
    ]
  },
  {
    file: 'src/pages/diensten/marco.astro',
    label: '#2 + #16 AI receptionist / virtuele receptionist',
    edits: [
      {
        from: 'description="Marco is uw AI-receptionist die 24/7 telefoon aanneemt in vloeiend Nederlands, afspraken plant en leads direct naar uw inbox stuurt."',
        to: 'description="AI receptionist Nederland: Marco is uw virtuele receptionist die 24/7 telefoon aanneemt in vloeiend Nederlands, afspraken plant en leads naar uw inbox stuurt."'
      }
    ]
  },
  {
    file: 'src/pages/diensten/ai-website-bundel-mkb-nederland.astro',
    label: '#11 AI website bundel',
    edits: [
      {
        from: 'Website + Marco + Emma — alles in één bundel, één factuur.',
        to: 'AI-Website Bundel - Website + Marco + Emma in één pakket, één factuur.'
      },
      {
        from: 'description="All-in-one bundel: AI-ready website + Marco AI-receptie + Emma WhatsApp Agent. Eén factuur, één SLA. €4.950 setup + €397/maand."',
        to: 'description="AI-Website Bundel MKB Nederland: AI-ready website + Marco AI-receptionist + Emma WhatsApp-agent in één pakket. 4.950 setup + 397 per maand. Eén factuur, één SLA."'
      }
    ]
  },
  {
    file: 'src/pages/diensten/telefoon-assistent.astro',
    label: '#10 AI telefoonassistent MKB',
    edits: [
      {
        from: 'description="Volledig aanpasbare AI-telefoonassistent die intakes doet, doorverbindt en gespreks-samenvattingen maakt. Eigen NL-telefoonnummer, CRM-integratie."',
        to: 'description="AI telefoonassistent voor MKB Nederland: 24/7 telefoonaanname in Nederlands, intakes, doorverbinden, gesprek-samenvattingen. Eigen NL-nummer, CRM-integratie."'
      }
    ]
  },
  {
    file: 'src/pages/diensten/index.astro',
    label: '#19 AI implementatie MKB',
    edits: [
      {
        from: 'description="18 diensten voor het Nederlandse MKB. AI-Website Bundel (combo), website laten maken, webshop laten maken, AI-receptionist, chatbot, document processing en"',
        to: 'description="AI implementatie MKB Nederland: 18 diensten voor Nederlandse bedrijven. AI-Website Bundel, website + webshop, AI-receptionist Marco, WhatsApp Emma, document processing."'
      }
    ]
  }
];

let totalEdits = 0;
let totalFilesChanged = 0;

for (const t of tweaks) {
  const filePath = path.join(ROOT, t.file);
  if (!fs.existsSync(filePath)) {
    console.error(`SKIP missing: ${t.file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanged = false;
  let appliedInFile = 0;

  for (const e of t.edits) {
    if (!content.includes(e.from)) {
      console.log(`  SKIP anchor not found in ${t.file}: ${e.from.slice(0, 70)}...`);
      continue;
    }
    if (content.includes(e.to)) {
      console.log(`  SKIP already-applied in ${t.file}`);
      continue;
    }
    const before = content;
    content = content.replace(e.from, e.to);
    if (content !== before) {
      fileChanged = true;
      appliedInFile++;
      totalEdits++;
    }
  }

  if (fileChanged) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFilesChanged++;
    console.log(`OK ${t.label} -> ${t.file} (${appliedInFile} edit${appliedInFile === 1 ? '' : 's'})`);
  } else {
    console.log(`-- no-op ${t.label} -> ${t.file}`);
  }
}

console.log(`\nTotal edits: ${totalEdits} across ${totalFilesChanged} files.`);
process.exit(0);
