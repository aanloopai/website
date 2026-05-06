/**
 * Q2.1 FAQ expansion — 9 pillars from 4-6 to 8 Q/A.
 * Idempotent: skips pillars where the anchor question already missing (already expanded).
 */
const fs = require('fs');
const path = require('path');

const KB = path.join(__dirname, '..', 'src', 'pages', 'kennisbank');

const updates = [
  {
    file: 'ai-automatisering-mkb.astro',
    additions: [
      { question: 'Wat is het verschil tussen AI automatisering en RPA (robotic process automation)?', answer: 'RPA volgt vaste, deterministische scripts — bijvoorbeeld bij elke e-mail met onderwerp factuur een veld kopiëren. AI automatisering begrijpt natuurlijke taal, intentie en context: een klant kan op meerdere manieren een afspraak vragen en de AI agent herkent dat. Voor MKB betekent dit dat AI automatisering 70-80% van de gevallen oplost, RPA slechts 30-40%. Wij combineren beide waar logisch: AI voor begrip, RPA-stappen voor harde regels.' },
      { question: 'Welke ROI mag ik verwachten van AI automatisering bij een MKB?', answer: 'Gemiddeld zien onze klanten in 3-6 maanden een terugverdientijd. Concrete cijfers: AI-receptionist Marco vangt 40-70% van de inkomende telefoontjes (besparing 1-2 fte op €25-€45/uur), Emma WhatsApp converteert 25-35% extra leads die anders verloren gingen, en factuur- en e-mailautomatisering bespaart 8-15 uur per week aan administratie. Bij een €597/mnd-abonnement is de break-even al bij 12-15 uur tijdsbesparing per maand.' }
    ]
  },
  {
    file: 'ai-avg-gdpr-compliance-mkb-nederland.astro',
    additions: [
      { question: 'Wat is het verschil tussen de AVG en de EU AI Act voor mijn AI-implementatie?', answer: 'De AVG (GDPR) reguleert verwerking van persoonsgegevens: rechtsgrondslag, DPA, datasubject-rechten, bewaartermijnen. De EU AI Act (in werking sinds 2024, gefaseerd tot 2026-2027) reguleert AI-systemen op basis van risico: verboden (social scoring), hoog risico (HR, krediet, biometrie), beperkt risico (chatbots — transparantieplicht), minimaal risico. Voor MKB-AI betekent dit beide tegelijk: AVG voor data, AI Act voor het AI-model. Aanloop AI levert standaard een gecombineerd compliance-pakket.' },
      { question: 'Mag ik telefoongesprekken met AI receptionist (Marco) opnemen onder AVG?', answer: 'Ja, mits u: (1) bij het begin van het gesprek expliciet meldt dat het gesprek wordt opgenomen voor kwaliteitsdoeleinden, (2) een wettelijke grondslag heeft (gerechtvaardigd belang of toestemming), (3) opnames maximaal 90 dagen bewaart tenzij er een conflict is, (4) opnames in de EU opslaat (Marco gebruikt EU-only datalocatie). Bij twijfel altijd de Autoriteit Persoonsgegevens-richtlijn raadplegen.' },
      { question: 'Hoe ga ik om met een AVG-verzoek tot inzage of vergetelheid bij AI-data?', answer: 'AI-systemen moeten datasubject-rechten ondersteunen: inzage (artikel 15), rectificatie (16), vergetelheid (17), beperking (18), portabiliteit (20). Bij Aanloop AI bouwen we standaard een admin-dashboard waarin u per klant alle gespreksopnames, transcripts en CRM-koppelingen kunt opzoeken en binnen 30 dagen verwijderen. AI-trainingsdata met persoonsgegevens vermijden wij volledig — onze modellen zijn vooraf getraind, geen klantdata in pretraining.' }
    ]
  },
  {
    file: 'ai-bouwbedrijf-offerte-automatisering.astro',
    additions: [
      { question: 'Hoe verwerkt AI offertes van leveranciers automatisch in mijn calculatie?', answer: 'Onze AI-workflow leest leveranciersoffertes (PDF, e-mail, WhatsApp) automatisch uit, koppelt prijzen aan uw calculatie-template (Excel, Bouw7, Syntess), en signaleert prijsstijgingen >5% versus vorige offerte. Bouwbedrijven besparen hiermee 4-8 uur per week per calculator, en voorkomen dat u offertes uitstuurt met verouderde leveranciersprijzen — een gangbare oorzaak van margeverlies.' },
      { question: 'Kan AI mijn offerte op locatie maken tijdens een bezichtiging?', answer: 'Ja. Met onze mobiele variant maakt de uitvoerder of accountmanager fotos, dicteert maatvoering en ruwe specs in het Nederlands, en de AI genereert binnen 90 seconden een concept-offerte met materiaalstaat en richtprijs. Bij Aanloop-klanten in de installatiebranche stijgt de offerte-conversie 18-25% omdat de prospect direct een prijsindicatie krijgt — nog voor de concurrent reageert.' }
    ]
  },
  {
    file: 'ai-makelaar-software.astro',
    additions: [
      { question: 'Welke AI-software gebruiken NVM- en VBO-makelaars in 2026?', answer: 'De meest gebruikte stack: (1) AI-receptionist voor 24/7 telefonische bereikbaarheid (Marco van Aanloop AI, Voicelabs, Belsimpel), (2) WhatsApp Business AI voor bezichtigings-aanvragen (Emma van Aanloop, Trengo), (3) AI-fototekst voor objectomschrijving (ChatGPT-gebaseerde tools), (4) AI-marktanalyse voor courtage-onderbouwing (CBS-data + lokale verkoopdata). NVM/VBO-leden gebruiken bovendien koppelingen naar realworks of itsmobile.' },
      { question: 'Kan AI volledig zelfstandig bezichtigingen inplannen voor mijn makelaarskantoor?', answer: 'Ja. Marco AI checkt uw agenda (Google Calendar, Outlook), reserveert tijdslots, stuurt automatisch bevestigingsmails (Brevo) en herinneringen, en verplaatst afspraken bij conflict. De makelaar wordt alleen geïnformeerd over de eindstand. In de praktijk besparen NVM-makelaars 6-12 uur per week aan agenda-coördinatie. Bij no-show stuurt Emma direct een herplannings-WhatsApp.' }
    ]
  },
  {
    file: 'ai-no-show-reductie-mkb-nederland.astro',
    additions: [
      { question: 'Met welke percentage daalt no-show in de praktijk na AI-implementatie?', answer: 'In de Nederlandse zorg-, beauty- en advies-sectoren zien onze klanten een no-show-daling van 35-65% binnen 90 dagen. Belangrijkste drivers: (1) WhatsApp-bevestiging 24u en 2u voor afspraak (open-rate 95% versus 18% bij e-mail), (2) AI vraagt actieve JA-bevestiging in plaats van passieve reminder, (3) automatische herplanning bij kan niet via Emma. Bij tandartspraktijken bespaart dit gemiddeld €3.000-€7.500 omzet per stoel per maand.' },
      { question: 'Werkt AI-no-show-reductie bij praktijken zonder online agenda?', answer: 'Ja. Wij koppelen aan papier-of-Excel-praktijken via een lichte web-agenda (gratis bij Aanloop-abonnement) of bestaande PMS-systemen (Tandartspraktijk: Exquise, Simplex; Fysiotherapie: Intramed, Spotonmedics; Beauty: Salonized, Treatwell). Geen rebuild nodig: AI leest de agenda, stuurt reminders, en synct status terug.' },
      { question: 'Hoe gaat de AI om met patienten die niet via WhatsApp werken?', answer: 'Marco AI valt automatisch terug naar telefonische bevestiging: belt 24u voor de afspraak, herkent ja/nee/verplaats, en logt het resultaat. Voor 65-plussers werkt dit beter dan WhatsApp. Bij geen gehoor stuurt het systeem een SMS-fallback. Hierdoor bedient een AI-laag de hele leeftijdsspread van uw patienten.' }
    ]
  },
  {
    file: 'ai-roi-berekenen-mkb-nederland-2026.astro',
    additions: [
      { question: 'Welke ROI-formule gebruik ik voor AI-receptionist Marco of WhatsApp-AI Emma?', answer: 'Standaardformule: ROI = ((bespaarde uren × intern uurtarief) + (extra omzet uit gevangen leads × marge) − abonnementskosten) ÷ abonnementskosten × 100%. Voorbeeld bij €597/mnd Marco: 60 uur tijdwinst × €35/uur = €2.100 + 4 extra leads × €750 marge = €3.000. ROI = (€2.100 + €3.000 − €597) ÷ €597 × 100% = 754% per maand. Wij leveren een klant-specifieke calculator met uw eigen cijfers.' },
      { question: 'Hoe lang duurt de gemiddelde terugverdientijd voor AI in een MKB?', answer: 'Mediaan over 60+ Aanloop-klanten: 3,2 maanden voor AI-receptionist (Marco), 4,1 maanden voor WhatsApp Emma, 5,8 maanden voor maatwerk-workflows (factuurautomatisering, lead-routing). De drie hoofdvariabelen: (1) huidig telefoon-/leadvolume, (2) gemiddelde marge per gevangen lead, (3) hoogte van het uurloon dat bespaard wordt. Bij volumes <20 inkomende calls/dag duurt het langer; bij >50 calls is het meestal binnen 2 maanden.' },
      { question: 'Welke verborgen kosten moet ik meenemen in mijn AI-ROI-berekening?', answer: 'Naast het maandabonnement: (1) eenmalige setup (€500-€2.500 afhankelijk van integraties), (2) telefonienummer-port en SIP-trunk (€15-€40/mnd), (3) intern projectmanagement (8-16 uur in eerste maand), (4) training van uw team (4-8 uur), (5) eventuele CRM/PMS-koppelingskosten. Aanloop AI publiceert deze posten standaard in elke offerte — geen verrassingen achteraf. De totale year-1-investering ligt typisch tussen €8.000-€15.000.' }
    ]
  },
  {
    file: 'ai-telefoniste-vs-mens.astro',
    additions: [
      { question: 'Welke gesprekken kan een AI-telefoniste niet aan en wanneer escaleert hij naar een mens?', answer: 'Marco AI escaleert automatisch bij: (1) emotionele klachten of woede-detectie (sentiment-analyse), (2) juridisch gevoelige vragen (klacht, ontbinding, schadeclaim), (3) onverwachte technische problemen waarvoor geen kennisbank-antwoord bestaat, (4) expliciet verzoek ik wil een mens spreken. Escalatie gaat naar uw mobiel of warm transfer naar een collega. Resultaat: 80-90% volledig AI-afgehandeld, 10-20% gerichte menselijke interventie waar het ertoe doet.' },
      { question: 'Hoe natuurlijk klinkt een AI-telefoniste anno 2026 vergeleken met een mens?', answer: 'Met de huidige stem-modellen (ElevenLabs Turbo v2.5, OpenAI tts-1-hd) is een AI-telefoniste in een blindtest van 30 seconden voor 70-80% van de Nederlandse bellers niet te onderscheiden van een mens. Bij langere gesprekken (>2 minuten) merken bellers de iets vlakkere intonatie en het ontbreken van spontane uitwijdingen. Wij melden bij elk gesprek expliciet dat het een AI is — verplicht onder de EU AI Act en goed voor het vertrouwen.' },
      { question: 'Wat zijn de jaarlijkse kosten van een AI-telefoniste versus een fulltime telefonist?', answer: 'Volledig fulltime telefonist: €36.000-€48.000 brutoloon + €11.000-€14.000 werkgeverslasten + €2.000-€4.000 werkplek = €49.000-€66.000 totaal. AI-telefoniste Marco: €597-€1.197/mnd × 12 = €7.164-€14.364 + €1.500 setup eenmalig = €8.664-€15.864 jaar 1. Besparing: 70-85%. Bovendien is Marco 24/7 beschikbaar, terwijl een telefonist alleen 40 uur/week werkt.' }
    ]
  },
  {
    file: 'ai-telefoonassistent-bedrijven.astro',
    additions: [
      { question: 'Welke telefonie-providers koppelt een AI-telefoonassistent aan in Nederland?', answer: 'Marco AI koppelt aan alle Nederlandse zakelijke telefonie-providers via SIP-trunk: KPN EEN, VoIP.ms, Anywhere365, Voys, Belsimpel Zakelijk, Bizner, RoutIT, Speakup, Cloud9. Geen vendor-lock-in: u behoudt uw bestaande nummer en provider. Migratie duurt 1-3 werkdagen, gefaseerde overname mogelijk (eerst overflow, dan primair).' },
      { question: 'Hoe lang duurt het om een AI-telefoonassistent te trainen op mijn bedrijfsspecifieke vragen?', answer: 'Standaard onboarding 7 werkdagen: dag 1-2 kennisbank-analyse uit uw website, FAQs en handleidingen, dag 3-4 maatwerk-flows (afspraken, escalatie, openingstijden), dag 5 testfase met u en team, dag 6-7 finetuning op echte gesprekken. Wij hertrainen automatisch wekelijks op basis van nieuwe gesprekken — uw assistant wordt elke week beter zonder dat u handmatig hoeft te updaten.' }
    ]
  },
  {
    file: 'ai-voicebot-vs-chatbot-mkb-vergelijking.astro',
    additions: [
      { question: 'Wanneer kies ik een voicebot en wanneer een chatbot voor mijn MKB?', answer: 'Voicebot (telefoon-AI zoals Marco) bij: hoog telefoonvolume, klanten 50+, urgentiegedreven sectoren (zorg, installatie, juridisch), 24/7 bereikbaarheid kritisch. Chatbot (web/WhatsApp zoals Emma) bij: jongere doelgroep, asynchrone communicatie, lange leadcycli, vaak terugkerende productvragen. De ideale MKB-stack heeft beide: Marco voor inkomend telefoon, Emma voor WhatsApp en webchat — dezelfde context-laag, een agenda.' },
      { question: 'Welke conversion-ratio mag ik verwachten bij voicebot versus chatbot?', answer: 'Mediaan over Aanloop-klanten: voicebot Marco zet 35-55% van inkomende telefoontjes om naar afspraak/lead, chatbot Emma 18-30% van WhatsApp-conversaties. Voicebot wint bij urgente intentie (nu een lekkage), chatbot wint bij vergelijkings-intentie (ik bekijk drie offertes). Beiden combineren levert 25-40% meer conversie dan elk apart, omdat de klant zelf kiest welk kanaal past.' },
      { question: 'Kunnen voicebot en chatbot dezelfde kennis delen zonder dubbele setup?', answer: 'Ja, dit is een kernvoordeel van Aanloop AI. Marco en Emma gebruiken dezelfde RAG-kennisbank (uw FAQs, productinfo, openingstijden). Update u 1x de kennisbank, dan weet zowel telefoon als chat het direct. Concurrenten leveren vaak twee separate engines met dubbele beheerlast. Wij hebben dit als een unified context-layer gebouwd — onze grootste UX-differentiator.' }
    ]
  }
];

let totalChanges = 0;

for (const u of updates) {
  const filePath = path.join(KB, u.file);
  if (!fs.existsSync(filePath)) {
    console.error(`SKIP missing: ${u.file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');

  const idxConst = content.indexOf('const faqItems = [');
  if (idxConst === -1) {
    console.error(`SKIP no faqItems: ${u.file}`);
    continue;
  }
  const slice = content.slice(idxConst);
  const closeRel = slice.indexOf('}];');
  if (closeRel === -1) {
    console.error(`SKIP no }] close: ${u.file}`);
    continue;
  }
  const closeAbs = idxConst + closeRel;
  const arraySegment = content.slice(idxConst, closeAbs);
  const existingCount = (arraySegment.match(/question:/g) || []).length;
  if (existingCount >= 8) {
    console.log(`SKIP already ${existingCount} Q/A: ${u.file}`);
    continue;
  }

  const additionsLines = u.additions.map(a => {
    const q = a.question.replace(/'/g, "\\'");
    const ans = a.answer.replace(/'/g, "\\'");
    return `,\n  { question: '${q}', answer: '${ans}' }`;
  }).join('');

  const before = content.slice(0, closeAbs) + '}';
  const after = content.slice(closeAbs + 3);
  const newContent = before + additionsLines + '];' + after;

  fs.writeFileSync(filePath, newContent, 'utf8');
  totalChanges++;
  console.log(`OK ${u.file} (${existingCount} -> ${existingCount + u.additions.length})`);
}

console.log(`\nTotal changes: ${totalChanges}`);
process.exit(0);
