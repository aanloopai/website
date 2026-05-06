#!/usr/bin/env node
// Wave-3 codemod: per-page exact title replacements for the long-tail that
// pattern-based waves 1+2 (seo-batch-shorten.cjs) could not shorten.
// Reads scripts/seo-audit-output.json, writes src/pages/**/*.astro.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AUDIT = path.join(ROOT, 'scripts', 'seo-audit-output.json');

const TITLE_SUFFIX = ' · Aanloop AI';
const TITLE_MAX = 60;

const EXACT = [
  ['AI Agency ${city} — AI Agents & Automatisering voor MKB in ${city} | Aanloop AI', 'AI Agency ${city} — AI voor MKB ${city}'],
  ['AI Agency ${city} — AI Agents en Automatisering voor MKB | Aanloop AI', 'AI Agency ${city} — AI voor MKB'],
  ['AI voor ${sector.title} in Nederland — AI Agents & Automatisering MKB | Aanloop AI', 'AI voor ${sector.title} NL — AI MKB'],
  ['AI Agency Sittard-Geleen — AI voor Chemelot-toeleveranciers en MKB', 'AI Agency Sittard-Geleen — Chemelot & MKB'],
  ['AI Agency Den Haag — AI Agents & Automation voor Den Haagse Bedrijven', 'AI Agency Den Haag — AI Agents MKB'],
  ['AI Agency Venlo — AI Agents voor Logistiek en Greenport Limburg', 'AI Agency Venlo — Logistiek & Greenport'],
  ['AI Agency Zaanstad — AI Agents voor Industrie en MKB Zaanstreek', 'AI Agency Zaanstad — Industrie & MKB'],
  ['AI Agency Den Bosch — AI Agents en Workflow Automation Brabant', 'AI Agency Den Bosch — Workflow Brabant'],
  ['Over Aanloop AI — AI Bureau Rotterdam | Team, Missie & KVK 88606902', 'Over Aanloop AI — Bureau Rotterdam'],
  ['Werkwijze · Aanloop AI — Van Adviesgesprek tot Live in 14 dagen', 'Werkwijze · Live in 14 dagen'],

  ['AI voor Accountancy & Administratie: Minder Bellen, Meer Adviseren', 'AI voor Accountancy: Minder Bellen, Meer Advies'],
  ['AI voor Bouwbedrijven & Installatiebedrijven — Nooit Meer Gemiste Aanvragen', 'AI voor Bouw & Installatie — Geen Gemiste Calls'],
  ['AI voor Detailhandel & E-commerce: Klantenservice, Bestellingen & Retouren', 'AI voor Detailhandel & E-commerce'],
  ['AI voor Horeca: Reserveringen, No-Show Reductie & Klantenservice', 'AI voor Horeca: Reserveringen & No-Show'],
  ['AI voor Logistiek & Transport: Track-and-Trace, Klantvragen & Documentverwerking', 'AI voor Logistiek: Track-and-Trace'],
  ['AI voor Zakelijke Dienstverlening: Minder Administratie, Meer Klantwaarde', 'AI voor Zakelijke Dienstverlening MKB'],
  ['AI voor Zorg & Welzijn: Afspraken, Intake & Patiëntcommunicatie', 'AI voor Zorg: Afspraken & Intake'],

  ['Aanloop AI vs Belsimpel/Toing-bots — AI-bureau of telecom-pakket?', 'Aanloop vs Belsimpel/Toing — bureau of telecom?'],
  ['Aanloop AI vs Chatlayer (Sinch): welke conversational-AI? | Vergelijking 2026', 'Aanloop vs Chatlayer — welke conversational-AI?'],
  ['Aanloop AI Marco vs Voicelabs Robin (mei 2026) — Eerlijke Vergelijking', 'Marco vs Voicelabs Robin (mei 2026)'],
  ['Aanloop AI vs Watermelon: welke AI-chatbot voor uw MKB? | Vergelijking 2026', 'Aanloop vs Watermelon — welke chatbot?'],
  ['AI-receptionist versus extern callcenter 2026 — kosten, kwaliteit en SLA MKB', 'AI-receptionist vs callcenter 2026 — kosten & SLA'],
  ['Emma vs Trengo: AI-WhatsApp of NL omnichannel? | Vergelijking 2026', 'Emma vs Trengo — AI-WhatsApp of omnichannel?'],
  ['Marco vs Emma — AI-receptionist of AI-WhatsApp voor uw MKB? | Aanloop AI vergelijking', 'Marco vs Emma — AI-receptie of AI-WhatsApp?'],
  ['Marco vs Make.com voice-flows — managed receptie of zelfgebouwd?', 'Marco vs Make.com — managed of zelfbouw?'],
  ['Marco vs Voiceflow — Nederlandse AI-telefoon of US voice-platform?', 'Marco vs Voiceflow — NL AI-telefoon of US?'],

  ['AI E-mail Assistent: Automatisch E-mails Beantwoorden & Sorteren', 'AI E-mail Assistent — automatisch sorteren'],
  ['AI HR & Recruitment Assistent: Vacatures & Screening Automatiseren', 'AI HR Assistent — Vacatures & Screening'],
  ['Emma — AI WhatsApp Bot MKB Nederland: Klantvragen in Seconden', 'Emma — AI WhatsApp Bot MKB NL'],
  ['Webshop Laten Maken NL 2026 — Shopify, WooCommerce, Lightspeed', 'Webshop Maken NL 2026 — Shopify & Woo'],
  ['5 Voorbeelden van AI Agents voor Nederlandse Bedrijven (2026)', '5 Voorbeelden AI Agents NL (2026)'],
  ['AI Bouwbedrijf — Offerte-Automatisering & Servicemonteur Routing MKB', 'AI Bouwbedrijf — Offertes & Routing MKB'],
  ['AI cashflow-prognose en finance-forecasting MKB Nederland — 2026', 'AI cashflow & forecasting MKB NL 2026'],
  ['AI sollicitatie-screening AVG en EU AI Act conform | MKB NL 2026', 'AI sollicitatie-screening AVG MKB NL 2026'],
  ['AI Voicebot vs Chatbot MKB NL 2026 | Welke past bij uw bedrijf', 'AI Voicebot vs Chatbot MKB NL 2026'],
  ['AI voor accountantskantoor NL 2026 — NBA-bewust en Wwft-respecterend', 'AI voor accountantskantoor NL 2026'],
  ['AI voor Accountantskantoor Nederland — Factuurverwerking, Klantintake & Compliance', 'AI voor Accountantskantoor — Factuur & Intake'],
  ['AI voor Advocatenkantoor 2026 — Intake, Dossiers, Conflict Check & Compliance', 'AI voor Advocatenkantoor 2026 — Intake'],
  ['AI voor advocatenkantoor NL 2026 — NOvA-bewust en beroepsgeheim-respecterend', 'AI voor advocatenkantoor NL 2026'],
  ['AI voor coach, trainer en zelfstandige in NL 2026 | Intake, agenda en follow-up automatiseren', 'AI voor coach & trainer NL 2026'],
  ['AI voor Detailhandel Nederland — Klantcontact, Voorraad & Click-and-Collect', 'AI voor Detailhandel NL — Click-and-Collect'],
  ['AI voor dierenartspraktijk NL 2026 | Spoedlijn-triage, afspraken en herinneringen', 'AI voor dierenartspraktijk NL 2026'],
  ['AI voor dierenartspraktijk NL 2026 — KNMvD-bewust, spoed-veilig, no-show 70 procent omlaag', 'AI voor dierenartspraktijk NL 2026'],
  ['AI voor evenementenbureau en cateraar NL 2026 | Offertes, gasten en planning automatiseren', 'AI voor evenementen & catering NL 2026'],
  ['AI voor financieel-planner NL 2026 — Wft Vermogen, jaarreview-conversie verdrievoudigt', 'AI voor financieel-planner NL 2026'],
  ['AI voor Fitnessclub en Zwemschool Nederland — Lid-onboarding, Lessen & Communicatie', 'AI voor Fitness & Zwemschool NL'],
  ['AI voor fysiotherapiepraktijk NL 2026 — KNGF-bewust, no-show 65% omlaag', 'AI voor fysiotherapie NL 2026'],
  ['AI voor Fysiotherapiepraktijk Nederland — Afspraken, No-Show & EPD-Koppeling', 'AI voor Fysiotherapie NL — No-Show & EPD'],
  ['AI voor Garagebedrijf en Autobedrijf Nederland — Afspraken, APK & Klantcontact', 'AI voor Garage & Autobedrijf NL — APK'],
  ['AI voor huisartsenpraktijk NL 2026 — NHG-bewust, doktersassistente 70% ontlast', 'AI voor huisartsenpraktijk NL 2026'],
  ['AI voor Huisartsenpraktijk Nederland — Triage, Afspraken & EPD-Koppeling', 'AI voor Huisartsenpraktijk NL — Triage & EPD'],
  ['AI voor hypotheekadviseur NL 2026 — AFM-bewust, Wwft-compliant, lead-conversie verdubbelt', 'AI voor hypotheekadviseur NL 2026'],
  ['AI voor installatiebedrijf en loodgieter NL 2026 | Spoedoproep, agenda en planning automatiseren', 'AI voor installatie & loodgieter NL 2026'],
  ['AI voor Logistiek MKB Nederland — Track-and-Trace, Klantservice & Documentverwerking', 'AI voor Logistiek MKB — Track & Trace'],
  ['AI voor marketingbureau NL 2026 | Lead-intake, rapportages en klantcontact automatiseren', 'AI voor marketingbureau NL 2026'],
  ['AI voor notariskantoor NL 2026 | KNB-conform en AVG-proof intake', 'AI voor notariskantoor NL 2026'],
  ['AI voor paardenarts NL 2026 — KNMvD-bewust, koliek-spoed 24/7, ambulante agenda geoptimaliseerd', 'AI voor paardenarts NL 2026'],
  ['AI voor pedicure-praktijk NL 2026 — ProVoet-bewust, no-show 75 procent omlaag, recall verdrievoudigt', 'AI voor pedicure-praktijk NL 2026'],
  ['AI voor Reisbureau en Touroperator Nederland — Boekingen, Vragen & Compliance', 'AI voor Reisbureau & Touroperator NL'],
  ['AI voor Restaurant Nederland — Reserveringen, Bestellingen & 24/7 Bereikbaarheid', 'AI voor Restaurant NL — Reserveringen 24/7'],
  ['AI voor rijschool en rijinstructeur NL 2026 | Lesplanning, examens en betalingen', 'AI voor rijschool NL 2026'],
  ['AI voor schoonheidssalon en kapsalon NL 2026 — no-show 80% omlaag', 'AI voor salon & kapsalon NL 2026'],
  ['AI voor Schoonheidssalon en Kapsalon Nederland — Afspraken, No-Show & WhatsApp', 'AI voor Salon & Kapsalon NL — No-Show'],
  ['AI voor schoonmaakbedrijf NL 2026 | Offertes, planning en klachten automatiseren', 'AI voor schoonmaakbedrijf NL 2026'],
  ['AI voor Shopify Webshop Nederland — Klantenservice, Voorraad & Conversie', 'AI voor Shopify Webshop NL — Service'],
  ['AI voor sportclub en vereniging NL 2026 | Ledenbeheer, contributie en planning', 'AI voor sportclub & vereniging NL 2026'],
  ['AI voor tandartspraktijk NL 2026 — KNMT-bewust, no-show 70% omlaag', 'AI voor tandartspraktijk NL 2026'],
  ['AI voor Tandartspraktijk Nederland — Afspraken, Behandelplannen & No-Show Reductie', 'AI voor Tandartspraktijk NL — No-Show'],
  ['AI voor tuinbouw, kweker en hoveniers NL 2026 | Bestellingen, planning en seizoen-pieken', 'AI voor tuinbouw & hoveniers NL 2026'],
  ['AI voor uitvaartondernemer NL 2026 | 24/7 emotioneel-bewuste telefoon-intake', 'AI voor uitvaartondernemer NL 2026'],
  ['AI voor Verzekeringsmakelaar en Financieel Adviseur Nederland', 'AI voor Verzekeringen & Financieel NL'],
  ['AI voor woningcorporatie en huurdersservice NL 2026 | Reparatieverzoeken en huurincasso', 'AI voor woningcorporatie NL 2026'],
  ['AI voor zorginstelling en thuiszorg Nederland — AVG art. 9 en EU AI Act 2026', 'AI voor zorg & thuiszorg NL — EU AI Act'],
  ['AI WhatsApp Business MKB Nederland — Setup, Use Cases & Prijzen 2026', 'AI WhatsApp Business MKB NL (2026)'],
  ['AI Workflow Automation: Complete Uitleg voor Beginners (2026)', 'AI Workflow Automation Uitgelegd (2026)'],
  ['De Beste AI Assistent voor MKB in Nederland — Vergelijking 2026', 'Beste AI Assistent MKB NL — 2026'],
  ['ChatGPT vs Claude vs Gemini MKB Nederland — vergelijking 2026', 'ChatGPT vs Claude vs Gemini MKB NL'],
  ['ElevenLabs AI Agent Koppelen aan Telefooncentrale (2026 Gids)', 'ElevenLabs AI + Telefoonkoppeling 2026'],
  ['EU AI Act MKB NL 2026 | Compliance-checklist, deadlines en boetes', 'EU AI Act MKB NL 2026 — checklist'],
  ['Make.com vs n8n vs Zapier vs Power Automate — Workflow Automation Vergelijking MKB 2026', 'Make.com vs n8n vs Zapier vs Power Automate'],
  ['n8n vs Make.com vs Zapier: Welke is het Beste voor MKB? (2026)', 'n8n vs Make.com vs Zapier MKB (2026)'],
];

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceField(content, field, oldVal, newVal) {
  const constRe = new RegExp(`(\\bconst\\s+${field}\\s*=\\s*)(['"\`])${escapeReg(oldVal)}\\2`);
  if (constRe.test(content)) return content.replace(constRe, `$1$2${newVal}$2`);
  const jsxLineRe = new RegExp(`(^\\s+${field}=)(['"])${escapeReg(oldVal)}\\2`, 'm');
  if (jsxLineRe.test(content)) return content.replace(jsxLineRe, `$1$2${newVal}$2`);
  const jsxInlineRe = new RegExp(`(<BaseLayout\\b[\\s\\S]*?\\b${field}=)(['"])${escapeReg(oldVal)}\\2`);
  if (jsxInlineRe.test(content)) return content.replace(jsxInlineRe, `$1$2${newVal}$2`);
  // JSX expression form: title={`...${expr}...`}
  const jsxExprRe = new RegExp(`(\\b${field}=\\{\`)${escapeReg(oldVal)}(\`\\})`);
  if (jsxExprRe.test(content)) return content.replace(jsxExprRe, `$1${newVal}$2`);
  return null;
}

const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
const exactMap = new Map(EXACT);
let fixed = 0;
let skipped = 0;
const log = [];

for (const row of audit.titleTooLong) {
  const file = path.join(ROOT, row.file);
  if (!fs.existsSync(file)) {
    log.push(`  [skip] ${row.file}: file not found`);
    skipped++;
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  const original = row.title;
  const replacement = exactMap.get(original);
  if (!replacement) {
    skipped++;
    continue;
  }
  const next = replaceField(content, 'title', original, replacement);
  if (!next) {
    log.push(`  [no-match] ${row.file}: regex failed for "${original.slice(0,40)}…"`);
    skipped++;
    continue;
  }
  fs.writeFileSync(file, next);
  const ft = replacement.includes('Aanloop') ? replacement : (replacement.length + TITLE_SUFFIX.length <= TITLE_MAX ? replacement + TITLE_SUFFIX : replacement);
  const flag = ft.length > TITLE_MAX ? '[partial]' : '[ok]';
  log.push(`  ${flag} ${row.file}: [${original.length}→${ft.length}] "${ft}"`);
  fixed++;
}

console.log(`Wave-3 titles: ${fixed} fixed, ${skipped} skipped`);
console.log('');
log.forEach((l) => console.log(l));
