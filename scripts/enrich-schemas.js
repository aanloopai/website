const fs = require('fs');
const path = require('path');

const files_data = {
  'ai-afspraken-inplannen.astro': {
    service_name: 'AI Afspraken Inplannen',
    description: 'AI agent die afspraken inplant, bevestigt en herinnert via telefoon, WhatsApp of chat. Nooit meer een dubbele boeking of gemiste afspraak. Starter €700/maand.',
    tiers: [
      {name: 'Starter', price: '700', desc: '1 agenda, 2 kanalen, SMS + e-mail bevestiging'},
      {name: 'Growth', price: '1800', desc: "Meerdere agenda's, alle kanalen, wachtlijst, CRM"},
      {name: 'Enterprise', price: 'Op maat', desc: 'Multi-locatie, multi-medewerker, SLA'}
    ]
  },
  'ai-chatbot-website.astro': {
    service_name: 'AI Chatbot voor Websites',
    description: 'AI chatbot voor uw website die leads kwalificeert, vragen beantwoordt en bezoekers omzet naar klanten. Starter vanaf €800/maand. KVK: 88606902.',
    tiers: [
      {name: 'Starter', price: '800', desc: '1 website, tot 500 vragen/dag'},
      {name: 'Growth', price: '2000', desc: 'Onbeperkt, multi-site, CRM-integratie'},
      {name: 'Enterprise', price: 'Op maat', desc: 'Dedicated infrastructure, SLA, custom training'}
    ]
  },
  'ai-document-processing.astro': {
    service_name: 'AI Document Processing',
    description: 'AI die facturen, contracten en PDF-documenten automatisch uitleest, categoriseert en verwerkt in uw systemen. 85% tijdsbesparing. Starter €1.200/maand.',
    tiers: [
      {name: 'Starter', price: '1200', desc: 'Tot 500 documenten/maand'},
      {name: 'Growth', price: '3000', desc: 'Onbeperkt, multi-ERP, advanced OCR'},
      {name: 'Enterprise', price: 'Op maat', desc: 'On-premise, dedicated infra, SLA'}
    ]
  },
  'ai-email-assistent.astro': {
    service_name: 'AI E-mail Assistent',
    description: 'AI e-mail assistent die inkomende e-mails sorteert, prioriteert en automatisch beantwoordt. Bespaar 5+ uur per week. Starter €600/maand. KVK: 88606902.',
    tiers: [
      {name: 'Starter', price: '600', desc: '1 mailbox, tot 500 e-mails/dag, Nederlandse taal'},
      {name: 'Growth', price: '1800', desc: 'Onbeperkt, meerdere mailboxen, CRM-koppeling, meertalig'},
      {name: 'Enterprise', price: 'Op maat', desc: 'On-premise, SSO, SLA, dedicated support'}
    ]
  },
  'ai-hr-recruitment.astro': {
    service_name: 'AI HR Recruitment Assistent',
    description: 'AI assistent die vacatureteksten schrijft, sollicitanten screent en HR-vragen beantwoordt. Bespaar 60% van uw recruitmenttijd. Starter €1.500/maand.',
    tiers: [
      {name: 'Starter', price: '1500', desc: '1 vacature tegelijk, pre-screening, planning'},
      {name: 'Growth', price: '3500', desc: 'Onbeperkt, voice screening, ATS-integratie, HR chatbot'},
      {name: 'Enterprise', price: 'Op maat', desc: 'Multi-vestiging, AVG-DPA, dedicated HR-consultant'}
    ]
  },
  'ai-klantenservice-omnichannel.astro': {
    service_name: 'AI Klantenservice Omnichannel',
    description: 'Eén AI die uw klantenservice beheert over alle kanalen: telefoon, live chat, WhatsApp en e-mail. Starter €2.000/maand. KVK: 88606902.',
    tiers: [
      {name: 'Starter', price: '2000', desc: '2-3 kanalen, tot 500 gesprekken/maand'},
      {name: 'Growth', price: '4500', desc: 'Alle kanalen, onbeperkt, sentiment-analyse'},
      {name: 'Enterprise', price: 'Op maat', desc: 'Custom channels, on-premise, SLA'}
    ]
  },
  'ai-lead-qualification.astro': {
    service_name: 'AI Lead Qualification Agent',
    description: 'AI agent die inkomende leads automatisch kwalificeert op budget, urgentie en fit. Alleen serieuze prospects bij uw salesteam. Starter €1.100/maand.',
    tiers: [
      {name: 'Starter', price: '1100', desc: '1 kanaal, BANT-model, e-mail rapportage, tot 200 leads/maand'},
      {name: 'Growth', price: '2800', desc: 'Meerdere kanalen, CRM-sync, custom scoringsmodel, onbeperkte leads'},
      {name: 'Enterprise', price: 'Op maat', desc: 'API-integratie, multi-team, SLA, dedicated support'}
    ]
  },
  'ai-seo-content-generator.astro': {
    service_name: 'AI SEO Content Generator',
    description: 'AI die SEO-geoptimaliseerde artikelen, landingspaginas en blogs schrijft afgestemd op uw merk en zoekwoorden. Starter €1.000/maand. KVK: 88606902.',
    tiers: [
      {name: 'Starter', price: '1000', desc: '8 artikelen/maand, zoekwoord-onderzoek, basis SEO'},
      {name: 'Growth', price: '2500', desc: 'Onbeperkt, CMS-publicatie, interne linking, schema markup'},
      {name: 'Enterprise', price: 'Op maat', desc: 'Content-strategie, concurrentieanalyse, dedicated editor'}
    ]
  },
  'ai-social-media-agent.astro': {
    service_name: 'AI Social Media Agent',
    description: 'AI agent die social media posts schrijft, publiceert en reacties beheert op LinkedIn, Instagram en Facebook. Starter €900/maand. KVK: 88606902.',
    tiers: [
      {name: 'Starter', price: '900', desc: '2 platforms, 12 posts/maand, basisanalytics'},
      {name: 'Growth', price: '2200', desc: 'Alle platforms, onbeperkt, CRM-sync, reactiebeheer'},
      {name: 'Enterprise', price: 'Op maat', desc: 'Multi-merk, PR-monitoring, dedicated strategist'}
    ]
  },
  'ai-verkoopagent-outbound.astro': {
    service_name: 'AI Verkoopagent Outbound',
    description: 'AI verkoopagent die prospects automatisch belt, kwalificeert en opvolgt. Schaalbare outbound sales zonder extra verkopers. Starter €1.500/maand. KVK: 88606902.',
    tiers: [
      {name: 'Starter', price: '1500', desc: 'Tot 500 calls/maand, 1 pitch, e-mail leads'},
      {name: 'Growth', price: '3500', desc: 'Onbeperkt, meerdere pitches, CRM-sync, A/B-test'},
      {name: 'Enterprise', price: 'Op maat', desc: 'Dedicated infra, SLA, account manager'}
    ]
  }
};

function buildSchemaLine(data) {
  const tiers = data.tiers;
  const catalogItems = tiers.map(t => {
    if (t.price === 'Op maat') {
      return `{ '@type': 'Offer', name: '${t.name}', description: '${t.desc.replace(/'/g, "\'")}', priceCurrency: 'EUR' }`;
    }
    return `{ '@type': 'Offer', name: '${t.name}', price: '${t.price}', priceCurrency: 'EUR', description: '${t.desc.replace(/'/g, "\'")}' }`;
  });

  const offersArray = tiers.filter(t => t.price !== 'Op maat').map(t =>
    `{ '@type': 'Offer', name: '${t.name}', price: '${t.price}', priceCurrency: 'EUR' }`
  ).join(', ');

  return `const schema = { '@context': 'https://schema.org', '@type': 'Service', name: '${data.service_name}', serviceType: '${data.service_name}', description: '${data.description.replace(/'/g, "\'")}', provider: { '@type': 'Organization', '@id': 'https://aanloopai.nl/#organization' }, areaServed: { '@type': 'Country', name: 'Nederland' }, audience: { '@type'
