// RSS 2.0 feed voor de Aanloop AI kennisbank
// https://aanloopai.nl/rss.xml

const SITE = 'https://aanloopai.nl';

const articles = [
  { slug: 'wat-is-een-ai-agent', title: 'Wat is een AI Agent? Complete Gids voor MKB 2026', date: '2026-05-01', description: 'AI agents leggen autonoom taken uit, integreren met systemen en handelen 24/7. Voor MKB Nederland.' },
  { slug: 'ai-agent-vs-chatbot', title: 'AI Agent vs Chatbot: Wat is het Verschil?', date: '2026-05-02', description: 'Het verschil tussen een AI agent en een chatbot uitgelegd met voorbeelden.' },
  { slug: 'ai-implementatie-stappen-mkb-nederland', title: 'AI Implementatie voor MKB Nederland: De 7 Stappen', date: '2026-05-01', description: 'Complete implementatiegids: 7 stappen voor succesvolle AI-adoptie. HowTo schema.' },
  { slug: 'ai-roi-berekenen-mkb-nederland-2026', title: 'AI ROI berekenen voor MKB — realistische cijfers per investering', date: '2026-05-01', description: 'Hoe u realistisch berekent of een AI investering zinvol is. HowTo schema.' },
  { slug: 'ai-avg-gdpr-compliance-mkb-nederland', title: 'AI en AVG-compliance voor MKB — wat u moet checken', date: '2026-05-01', description: 'AVG-eisen voor AI-tools in het MKB: checklist, leverancierscriteria en risicos. HowTo schema.' },
  { slug: 'ai-no-show-reductie-mkb-nederland', title: 'AI no-show reductie — gemiste afspraken voorkomen', date: '2026-05-01', description: 'No-show reductie van 15-30 procent naar 4-9 procent met AI multi-touch herinneringen. HowTo schema.' },
  { slug: 'ai-whatsapp-business-mkb-nederland', title: 'AI WhatsApp Business voor MKB Nederland', date: '2026-04-30', description: 'WhatsApp Business AI-assistent: 24/7 klantcontact, herinneringen, no-show reductie. HowTo schema.' },
  { slug: 'ai-facturering-automatisering', title: 'Hoe Automatiseer je Facturering met AI? (Stap-voor-Stap)', date: '2026-05-07', description: 'Factuurverwerking automatiseren met AI en n8n. PDF naar boekhouding in 6 stappen. HowTo schema.' },
  { slug: 'n8n-automatisering-mkb', title: 'N8N Workflow Automatisering voor MKB — Gids 2026', date: '2026-05-01', description: 'n8n self-hosted opzetten voor MKB workflow-automation. HowTo schema.' },
  { slug: 'ai-voor-installatiebedrijf-loodgieter-nederland', title: 'AI voor Installatiebedrijf en Loodgieter Nederland', date: '2026-05-01', description: 'Spoedoproepen, agenda en offerte automatiseren voor installatie-MKB. HowTo schema.' },
  { slug: 'ai-bouwbedrijf-offerte-automatisering', title: 'AI voor Bouwbedrijven: offertes en planning op autopilot', date: '2026-05-02', description: 'Offerte-automatisering voor bouw- en installatiebedrijven. HowTo schema.' },
  { slug: 'ai-voor-rijschool-lesplanning-nederland', title: 'AI voor Rijschool Nederland — Lesplanning, Examens en Betalingen', date: '2026-05-01', description: 'AI WhatsApp voor rijscholen: 70 procent no-show reductie, CBR-koppeling. HowTo schema.' },
  { slug: 'voice-ai-klantenservice', title: 'Voice AI Agents voor Klantenservice: Werkt het Echt?', date: '2026-05-08', description: 'Eerlijke analyse van voice AI: kosten, kwaliteit, beperkingen. Speakable schema.' },
  { slug: 'ai-telefoniste-vs-mens', title: 'AI Telefoniste vs Mens: Kostenbesparing & Kwaliteit', date: '2026-05-10', description: 'Eerlijke vergelijking: AI telefoniste vs menselijke receptionist. Speakable schema.' },
  { slug: 'n8n-vs-make-com', title: 'n8n vs Make.com vs Zapier: Welke is het Beste voor MKB?', date: '2026-05-06', description: 'Volledige vergelijking n8n, Make.com en Zapier voor MKB Nederland. Speakable schema.' },
  { slug: 'ai-workflow-automation', title: 'AI Workflow Automation: Complete Uitleg voor Beginners', date: '2026-05-05', description: 'Wat is AI workflow automation, hoe werkt het? Beginnersgids met praktijkvoorbeelden. Speakable schema.' },
  { slug: 'beste-ai-assistent-mkb-nederland', title: 'De Beste AI Assistent voor MKB in Nederland (2026)', date: '2026-05-01', description: 'Vergelijking van de beste AI-assistenten voor het Nederlandse MKB. Speakable schema.' },
  { slug: 'chatgpt-voor-bedrijven-mkb', title: 'ChatGPT voor Bedrijven vs AI Agents — Wat Past bij uw MKB?', date: '2026-05-01', description: 'ChatGPT vs gespecialiseerde AI agents. Speakable schema.' },
  { slug: 'ai-automatisering-mkb', title: 'AI Automatisering voor MKB — Praktische Gids 2026', date: '2026-05-01', description: 'Welke processen kunt u automatiseren met AI? Speakable schema.' },
  { slug: 'ai-agent-voorbeelden', title: '5 Voorbeelden van AI Agents voor Nederlandse Bedrijven', date: '2026-05-04', description: 'Concrete voorbeelden van AI agents in MKB Nederland. Speakable schema.' },
  { slug: 'ai-agent-kosten-mkb', title: 'AI Agent Kosten voor MKB Nederland — Pakketprijzen 2026', date: '2026-05-01', description: 'Wat kost een AI agent? Pakketten, custom-prijzen en kostendrijvers.' },
  { slug: 'ai-prijzen-vergelijking-mkb-2026', title: 'AI Prijzen Vergelijking voor MKB Nederland 2026', date: '2026-05-01', description: 'Marktprijzen vergeleken: Aanloop AI, ChatGPT, custom builds.' },
  { slug: 'ai-receptionist-vs-ai-telefoniste-vergelijking', title: 'AI Receptionist vs AI Telefoniste — Wat is het Verschil?', date: '2026-05-01', description: 'Twee termen voor verschillende oplossingen. Wat past bij uw MKB?' },
  { slug: 'ai-voicebot-vs-chatbot-mkb-vergelijking', title: 'AI Voicebot vs Chatbot voor MKB — Vergelijking', date: '2026-05-01', description: 'Voice of text AI? Wanneer welke kiezen voor uw MKB.' },
  { slug: 'ai-klantenservice-voor-mkb-2026', title: 'AI Klantenservice voor MKB 2026 — Volledige Gids', date: '2026-05-01', description: 'AI inzetten voor klantenservice: kanalen, kosten, ROI en stappenplan.' },
  { slug: 'ai-tools-zzp-freelancers-nederland', title: 'AI Tools voor ZZP en Freelancers Nederland', date: '2026-05-01', description: 'De beste AI-tools voor zelfstandigen in Nederland.' },
  { slug: 'ai-makelaar-software', title: 'AI Makelaar Software — Tools voor Vastgoed Nederland', date: '2026-05-01', description: 'Software-keuze voor makelaars in 2026.' },
  { slug: 'ai-telefoonassistent-bedrijven', title: 'AI Telefoonassistent voor Bedrijven', date: '2026-05-01', description: 'AI als eerstelijns telefoonassistent: 24/7, NL-talig, agenda-koppeling.' },
  { slug: 'elevenlabs-ai-agent-koppelen', title: 'ElevenLabs AI Agent Koppelen aan Telefooncentrale', date: '2026-05-01', description: 'Stap-voor-stap ElevenLabs voice AI koppelen via SIP-trunk. HowTo schema.' },
  { slug: 'ai-voor-accountantskantoor-nederland-2026', title: 'AI voor Accountantskantoor Nederland', date: '2026-05-01', description: 'AI voor accountancy: factuur-OCR, btw-aangiftes, debiteurenbeheer.' },
];

export async function GET() {
  const buildDate = new Date().toUTCString();
  const items = articles
    .map(
      (a) => `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${SITE}/kennisbank/${a.slug}/</link>
      <guid isPermaLink="true">${SITE}/kennisbank/${a.slug}/</guid>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <description><![CDATA[${a.description}]]></description>
      <author>hello@aanloopai.nl (Mustafa Agah Dogan)</author>
      <category>AI</category>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Aanloop AI Kennisbank</title>
    <link>${SITE}/kennisbank/</link>
    <description>Praktische AI-gidsen voor het Nederlandse MKB: AI agents, voicebots, WhatsApp AI, workflow automation, AVG-compliance, sector-specifiek advies.</description>
    <language>nl-NL</language>
    <copyright>Aanloop AI B.V.</copyright>
    <managingEditor>hello@aanloopai.nl (Mustafa Agah Dogan)</managingEditor>
    <webMaster>hello@aanloopai.nl (Mustafa Agah Dogan)</webMaster>
    <pubDate>${buildDate}</pubDate>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <generator>Astro 4.16</generator>
    <ttl>1440</ttl>
    <image>
      <url>${SITE}/logo-mark-light-1024.png</url>
      <title>Aanloop AI Kennisbank</title>
      <link>${SITE}/kennisbank/</link>
    </image>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
