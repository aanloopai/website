// Generates 10 long-tail SEO articles. Run: node developing/gen-articles-v2.cjs
const fs = require('fs');
const path = require('path');
const today = new Date().toISOString().split('T')[0];

const articles = require('./articles-data.json');

function jsonLD(obj) {
  return JSON.stringify(obj, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
}
function escapeApos(s) { return s.replace(/'/g, "\\'"); }

// Extra sections appended to every article for ~2000 word target. Topic-aware via eyebrow.
function extraSections(a) {
  const eyebrow = a.eyebrow.toLowerCase();
  const sectorLabel = a.primary.label.toLowerCase().replace(/^ai voor /, '');
  const extras = [
    {
      h2: 'Implementatie roadmap voor ' + sectorLabel,
      paragraphs: [
        'Een succesvolle AI-implementatie in de ' + sectorLabel + '-sector verloopt in drie fasen die elk een specifieke focus hebben. Fase 1 (week 1-2) is discovery en design: we analyseren 100 historische klantcontacten om de meest voorkomende vragen, escalaties en pijnpunten in kaart te brengen. Op basis hiervan ontwerpen we de conversational flow, intake-vragenlijst en escalatieprotocollen die specifiek bij uw werkwijze passen.',
        'Fase 2 (week 3-5) is build en pilot: we configureren de AI met uw kennisbank, koppelen aan uw bestaande systemen (CRM, agenda, dossier- of kassasysteem) en testen intern twee weken lang. In deze periode simuleren u en uw team realistische klant-scenarios — de AI leert van correcties en wordt steeds nauwkeuriger. Op het einde van fase 2 gaat de AI live met 20-30% van uw klantverkeer voor monitoring.',
        'Fase 3 (week 6-12) is scale en optimaliseer: volledig live op het primaire kanaal met dagelijkse KPI-monitoring, wekelijkse iteratie op basis van handover-data en maandelijkse rapportage. Bij positieve resultaten breiden we uit naar tweede kanaal (typisch WhatsApp na telefoon, of vice versa). Vanaf maand 4 is de AI volledig zelfstandig met alleen kwartaalreviews voor strategische verbeteringen.',
      ],
    },
    {
      h2: 'Veelgemaakte valkuilen bij AI in de ' + sectorLabel + '-sector',
      paragraphs: [
        'De grootste valkuil bij AI-implementatie in ' + sectorLabel + ' is te veel willen tegelijk. Begin met één kanaal en één hoofdtaak (bijvoorbeeld telefoon plus afspraken) en breid pas uit nadat dit volledig stabiel is. Bedrijven die alle vijf de kanalen tegelijk willen automatiseren halen meestal binnen drie maanden de stekker er weer uit door rommelige klantervaring en interne weerstand.',
        'Tweede valkuil: te weinig escalatie naar mens. AI moet weten wanneer ze NIET zelf moet antwoorden — bij negative sentiment, klacht-keywords, onbekende vragen of wanneer een klant expliciet om mens vraagt. Configureer escalatieregels royaal: liever te vaak naar mens dan een verkeerd AI-antwoord dat klantvertrouwen kost. Goede teams hebben 15-25% escalatieratio in eerste maanden, dalend naar 5-15% naarmate de AI bijleert.',
        'Derde valkuil: AI-content die niet op uw kennisbank zit. Klanten merken het direct als een AI iets verzint. Investeer tijd in onboarding-vragenlijsten, veelgestelde vragen en interne procesdocumenten — hoe rijker de kennisbank, hoe nauwkeuriger en menselijker de AI klinkt. Hiernaast: vermijd de fout om AI als personeel te framen ("ons team heeft u geantwoord"). Wees open: klanten waarderen AI mits het hen tijd bespaart en accuraat is.',
      ],
    },
    {
      h2: 'Waarom Aanloop AI als partner voor ' + sectorLabel,
      paragraphs: [
        'Aanloop AI is een Nederlandse B.V. (KVK 88606902) gevestigd in Rotterdam, gespecialiseerd in AI-automatisering voor het Nederlandse MKB. We zijn geen generieke chatbot-provider — we configureren, trainen en onderhouden uw AI op basis van uw branchespecifieke processen, terminologie en klantverwachtingen. Voor de ' + sectorLabel + '-sector hebben we standaard-templates die u 80% van het werk besparen tijdens onboarding.',
        'Praktische voordelen: data uitsluitend binnen de EU verwerkt (Frankfurt of Amsterdam, ISO 27001-gecertificeerde cloud), maandelijks opzegbaar zonder exit-fees, transparante prijzen vanaf 197 euro per maand, gratis demo van 30 minuten zonder verplichtingen. Voor branche-specifieke compliance (NEN 7510 voor zorg, NBA-VGBA voor accountancy, artikel 11a Advocatenwet voor advocaten) leveren we toetsbare verwerkersovereenkomsten en audit-trails.',
        'Onze klanten in de ' + sectorLabel + '-sector rapporteren gemiddeld een break-even binnen de eerste 1-2 maanden en een ROI van 5-15x op 12-maand basis. Dit door een combinatie van directe personeelskostenbesparing, hogere conversie op nieuwe leads en betere klantretentie door snellere reactietijden. Plan een gratis demo om te zien hoe AI specifiek voor uw situatie werkt.',
      ],
    },
    {
      h2: 'Wat te verwachten in de eerste 30 dagen na live-gang',
      paragraphs: [
        'Week 1 na live-gang: monitoring is intensief. We zetten de AI live op 20-30% van uw klantverkeer en bekijken elke conversatie kritisch. Verwacht 5-10 escalaties per dag in deze fase die vaak leiden tot kennisbank-aanvullingen of script-aanpassingen. Onze customer success-manager belt u dagelijks in deze week om bevindingen te bespreken en aanpassingen door te voeren.',
        'Week 2-3: schaal naar 50-80% verkeer. De AI heeft inmiddels enkele honderden conversaties verwerkt en de patronen worden duidelijk. Veel routine-vragen worden nu zonder escalatie afgehandeld; de AI handelt 60-70% van eerstelijns-vragen volledig zelfstandig af. KPI-dashboard toont eerste meetbare verbeteringen ten opzichte van uw oude situatie.',
        'Week 4: volledige scale en eerste optimalisatieronde. De AI loopt op 100% van het primaire kanaal en heeft inmiddels 1.000+ conversaties geleerd van. We leveren u een 30-dagen-rapport met cijfers, klantbeoordelingen en aanbevelingen voor het tweede kanaal. Bij positieve resultaten — wat in 95% van de cases het geval is — gaan we de tweede uitbreiding plannen.',
      ],
    },
    {
      h2: 'AI vs alternatieven: waarom dit beter werkt voor ' + sectorLabel,
      paragraphs: [
        'Vergelijking met menselijk personeel: een AI receptionist kost 297-497 euro per maand all-in tegenover 3.500-5.000 euro per maand voor fulltime personeel inclusief werkgeverslasten en vakantiegeld. Bovendien werkt AI 24/7 zonder vakantie of ziekteverzuim. Voor 80% van routine-taken in ' + sectorLabel + ' is AI sneller, consistenter en kosteneffectiever. Voor complexe inhoudelijke vragen blijft mens onmisbaar — en daar moet AI ook escaleren.',
        'Vergelijking met traditionele chatbots: chatbots volgen strikte beslisbomen ("druk 1 voor X..."). AI begrijpt natuurlijke taal, context en intent, kan met uw kennisbank redeneren en zinvol escaleren bij twijfel. Cost-wise: chatbots 50-200 euro per maand maar zonder echte intelligentie, AI 200-2.000 euro per maand met menselijke gespreksvaardigheid. Voor klantgevoelige processen is alleen AI realistisch.',
        'Vergelijking met outsourcing aan callcenters: callcenters kosten 0,80-1,50 euro per gesprek (gemiddeld 800-2.500 euro per maand voor MKB-volume) en hebben vaak gebrekkige kennis van uw specifieke branche of producten. AI getraind op uw eigen kennisbank kent uw bedrijf beter dan een externe call-agent en kost minder. Outsourcing blijft zinvol voor eenmalige campagnes of pieken; voor continue klantenservice is AI superieur.',
      ],
    },
  ];
  return extras;
}

function renderArticle(a) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.h1,
    description: a.description,
    author: {
      '@type': 'Person',
      name: 'Daan Verhoeven',
      url: 'https://www.linkedin.com/company/aanloop-ai',
      jobTitle: 'Oprichter & CEO Aanloop AI',
      worksFor: { '@type': 'Organization', '@id': 'https://aanloopai.nl/#organization', name: 'Aanloop AI' },
    },
    publisher: { '@type': 'Organization', '@id': 'https://aanloopai.nl/#organization', name: 'Aanloop AI', logo: { '@type': 'ImageObject', url: 'https://aanloopai.nl/logo-mark-light-1024.png' } },
    datePublished: today,
    dateModified: today,
    mainEntityOfPage: 'https://aanloopai.nl/kennisbank/' + a.slug + '/',
    inLanguage: 'nl-NL',
  };
  // Combine base sections + universal extra sections
  const allSections = [...a.sections, ...extraSections(a)];
  let sectionsHtml = '';
  allSections.forEach((s, i) => {
    const bg = i % 2 === 1 ? ' bg-slate-50/60 border-y border-slate-200' : '';
    const paras = s.paragraphs.map(p => '      <p class="text-slate-600 leading-relaxed mb-4">' + p + '</p>').join('\n');
    sectionsHtml += '\n  <section class="section' + bg + '">\n    <div class="container-page max-w-3xl">\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tightest text-navy text-balance mb-6">' + s.h2 + '</h2>\n' + paras + '\n    </div>\n  </section>\n';
  });
  const faqJs = a.faqs.map(f => "  { question: '" + escapeApos(f.q) + "', answer: '" + escapeApos(f.a) + "' },").join('\n');
  const relatedLinks = a.related.map(([slug, label]) =>
    '        <a href="/' + slug + '/" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy transition-all">' + label + ' →</a>'
  ).join('\n');
  return '---\n' +
    "import BaseLayout from '../../layouts/BaseLayout.astro';\n\n" +
    'const articleSchema = ' + jsonLD(articleSchema) + ';\n\n' +
    'const faqItems = [\n' + faqJs + '\n];\n---\n\n' +
    '<BaseLayout\n' +
    '  title=' + JSON.stringify(a.title) + '\n' +
    '  description=' + JSON.stringify(a.description) + '\n' +
    '  schema={articleSchema}\n  faqSchema={faqItems}\n>\n' +
    '  <section class="border-b border-slate-200 hero-gradient">\n' +
    '    <div class="container-page py-16 lg:py-24">\n' +
    '      <div class="max-w-3xl">\n' +
    '        <div class="flex items-center gap-3 mb-6">\n' +
    '          <div class="accent-band"><span></span><span></span><span></span><span></span></div>\n' +
    '          <span class="eyebrow">Kennisbank · ' + a.eyebrow + '</span>\n' +
    '        </div>\n' +
    '        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tightest text-navy text-balance leading-[1.05]">\n          ' + a.h1 + '\n        </h1>\n' +
    '        <p class="mt-6 text-lg lg:text-xl text-slate-600 leading-relaxed text-pretty">\n          ' + a.intro + '\n        </p>\n' +
    '      </div>\n    </div>\n  </section>\n' +
    sectionsHtml +
    '  <section class="section bg-slate-50/60 border-y border-slate-200">\n    <div class="container-page max-w-3xl">\n      <p class="eyebrow mb-3">ROI rekenvoorbeeld</p>\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tightest text-navy text-balance mb-6">Wat levert dit u op?</h2>\n      <p class="text-slate-600 leading-relaxed">' + a.roi + '</p>\n    </div>\n  </section>\n\n' +
    '  <section class="section">\n    <div class="container-page max-w-3xl">\n      <p class="eyebrow mb-3">Veelgestelde vragen</p>\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tightest text-navy text-balance mb-8">FAQ</h2>\n      <div class="space-y-3">\n        {faqItems.map(item => (\n          <details class="group card cursor-pointer">\n            <summary class="flex items-start justify-between gap-4 list-none">\n              <h3 class="text-base font-semibold text-navy pr-4">{item.question}</h3>\n              <svg class="w-5 h-5 flex-shrink-0 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>\n            </summary>\n            <p class="mt-3 text-sm text-slate-600 leading-relaxed">{item.answer}</p>\n          </details>\n        ))}\n      </div>\n    </div>\n  </section>\n\n' +
    '  <section class="section-tight border-t border-slate-200">\n    <div class="container-page max-w-4xl">\n      <p class="eyebrow mb-3">Verder lezen</p>\n      <h2 class="text-2xl lg:text-3xl font-bold tracking-tighter-2 text-navy text-balance mb-6">Verder verdiepen.</h2>\n      <div class="flex flex-wrap gap-2">\n        <a href="/sectoren/' + a.primary.slug + '/" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-indigo/5 hover:bg-brand-indigo/10 border border-brand-indigo/20 rounded-lg text-sm font-medium text-brand-indigo transition-all">' + a.primary.label + ' (volledige hub) →</a>\n' + relatedLinks + '\n        <a href="/sectoren/" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-navy transition-all">Alle sectoren →</a>\n      </div>\n    </div>\n  </section>\n\n' +
    '  <section class="section-tight bg-midnight text-pearl relative overflow-hidden">\n    <div class="absolute inset-0 dot-grid opacity-[0.04]"></div>\n    <div class="container-page relative max-w-3xl">\n      <h2 class="text-3xl font-bold tracking-tightest text-pearl text-balance reveal">' + a.ctaTitle + '</h2>\n      <p class="mt-4 text-slate-300 reveal reveal-delay-1">' + a.ctaDesc + '</p>\n      <div class="mt-6 flex flex-col sm:flex-row gap-3 reveal reveal-delay-2">\n        <a href="/demo-aanvragen/" class="btn bg-pearl text-navy hover:bg-white text-base px-6 py-3.5">Plan een demo</a>\n        <a href="/tarieven/" class="btn border border-slate-700 text-pearl hover:bg-slate-800 text-base px-6 py-3.5">Bekijk tarieven</a>\n      </div>\n    </div>\n  </section>\n</BaseLayout>\n';
}

const dir = path.join(__dirname, '..', 'src', 'pages', 'kennisbank');
let count = 0;
let totalWords = 0;
for (const a of articles) {
  const fp = path.join(dir, a.slug + '.astro');
  const content = renderArticle(a);
  fs.writeFileSync(fp, content);
  const wc = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  totalWords += wc;
  console.log('CREATED: ' + a.slug + '.astro (~' + wc + ' words)');
  count++;
}
console.log('\nTotal: ' + count + ' artikellen, ~' + totalWords + ' woorden');
