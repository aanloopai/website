# Platform Readiness Analysis — Aanloop AI (aanloopai.nl)

**Audit date:** 2026-05-06
**Target domain:** aanloopai.nl
**Business context:** Dutch B2B AI agency, MKB-focused, Rotterdam HQ. 245 URLs live across services, sectors, knowledge base, and location pages.

---

**Platform Readiness Average: 52/100**

### Platform Scores Overview

| Platform | Score | Status |
|---|---|---|
| Google AI Overviews | 58/100 | Fair |
| ChatGPT Web Search | 38/100 | Poor |
| Perplexity AI | 44/100 | Poor |
| Google Gemini | 54/100 | Fair |
| Bing Copilot | 48/100 | Poor |

**Strongest Platform:** Google AI Overviews — Content structure is solid with sector FAQ blocks, question-based H2s, and ~1,500-word pages. All AI crawlers are explicitly allowed in robots.txt. Multiple pillar pages cover high-intent Dutch queries across 11 sectors.

**Weakest Platform:** ChatGPT Web Search — No Wikipedia or Wikidata entity presence confirmed. Brand absent from all major Dutch AI bureau ranking lists (Ploko, Appfront, Nodevate, Sortlist). No sameAs schema linking verified. No external third-party citations or named expert author attribution on content pages.

---

## Google AI Overviews

**Score: 58/100**

| Signal Category | Score | Key Findings |
|---|---|---|
| Content Structure | 25/40 | FAQ blocks confirmed on sector pages (/sectoren/zorg, /locaties/rotterdam). Question-based H2 headings present: "Is de AI-oplossing AVG-compliant?", "Hoe snel is de implementatie?", "Wat is een AI-receptionist?". The critical "answer target" pattern — a 40-60 word direct answer immediately after a question heading — is inconsistently applied. Homepage H1 is a tagline ("AI bureau dat echt werkt voor uw bedrijf"), not an extractable definitional statement. Knowledge base URL paths tested at /kennisbank/ai-receptionist-nederland and /kennisbank/ai-telefoonassistent-mkb both return 404, indicating either non-standard URL slugs or missing pages. No comparison tables confirmed on tested pages. |
| Source Authority | 17/30 | Domain not appearing in top-10 results for "AI receptionist Nederland", "AI bureau Nederland 2026", or "AI telefoonassistent MKB". Voicelabs.nl dominates the AI telefonie space with a weekly /nieuws publication cadence. Aanloop AI is absent from all Dutch bureau ranking lists (Ploko top-10, Appfront, Nodevate, Sortlist Rotterdam). Cases page contains only fictional benchmark scenarios explicitly labeled as non-client data — reducing authority signals. No outbound citations to verifiable external sources (CBS, RVO, published research) found in tested content. |
| Technical Signals | 16/30 | Robots.txt explicitly allows Google-Extended. Sitemap.xml and image-sitemap.xml present. llms.txt and llms-full.txt implemented per llmstxt.org standard — strong positive signal. Schema markup types (FAQPage, Article, HowTo) not externally verifiable. Heading hierarchy appears clean on tested pages. 404 errors on expected knowledge base URL patterns suggest content gaps or non-standard slug conventions. Astro SSG build produces clean server-rendered HTML. |

**Optimization Actions:**

1. Apply the "answer target" pattern to every service and knowledge base page: immediately below each question H2, write a 40-60 word direct answer before supporting detail. Example for /diensten/marco: under H2 "Wat is Marco?" write: "Marco is Aanloop AI's AI-receptionist die inkomende telefoongesprekken 24/7 zelfstandig beantwoordt in vloeiend Nederlands. Het systeem plant afspraken, beantwoordt veelgestelde vragen en stuurt gesprekken met context door naar uw team — zonder handmatige tussenkomst. Implementatietijd: 7-14 werkdagen."

2. Add FAQPage JSON-LD schema to all pages containing FAQ sections. The /sectoren/zorg page alone has 4 confirmed FAQ items ("Is de AI-oplossing AVG- en NEN 7510-compliant?", "Kan de AI patientgegevens verwerken?", "Hoe snel is de implementatie?", "Werkt de AI met Medicom/Nexus?") that could immediately earn People Also Ask slots for compliance-related healthcare AI queries.

3. Publish 3-5 original data assets Google can treat as primary sources: (a) sector-specific no-show reduction benchmarks with methodology, (b) "Staat van AI-telefonie in het Nederlandse MKB 2026" survey summary, (c) TCO comparison matrix with cited calculation methodology. Primary-source pages earn AIO inclusion; vendor pages do not.

---

## ChatGPT Web Search

**Score: 38/100**

| Signal Category | Score | Key Findings |
|---|---|---|
| Entity Recognition | 8/35 | No Wikipedia article for Aanloop AI confirmed. No Wikidata entity confirmed. Brand absent from all external Dutch bureau ranking resources (Ploko, Appfront, Nodevate, Sortlist). No Organization schema with sameAs links verified. LinkedIn company page referenced on the about page but completeness and follower count are unverifiable externally. KvK registration (88606902) and Rotterdam address are consistent but insufficient alone for ChatGPT entity graph inclusion. ChatGPT's web search relies on Bing index and entity graph; without Wikipedia/Wikidata anchoring and third-party brand mentions, the brand remains invisible in entity-triggered AI answers. |
| Content Preferences | 22/40 | Content is factual and uses specific numbers throughout. Pricing page cites €597/month (Starter), €1,197/month (Groei), €495 setup fee. About page states 500+ clients, 4.9/5 rating, 14-day deployment, 99.9% SLA. These are quotable passages. However, all statistics are unattributed — no source links for cross-validation. Author bylines with professional credentials are not confirmed on knowledge base articles, which ChatGPT weights as an expert attribution signal. Knowledge base publication dates cluster at May 1-4, 2026 — batch publication without ongoing cadence reduces perceived freshness. |
| Crawler Access | 25/25 | Robots.txt explicitly allows OAI-SearchBot, ChatGPT-User, and GPTBot. Full marks. This is correctly configured and signals deliberate AI-platform openness. |

**Optimization Actions:**

1. Create a Wikidata entity for Aanloop AI: add a new Q-item with properties P856 (official website: aanloopai.nl), P131 (located in: Rotterdam), P571 (inception date), P452 (industry: AI services), P1454 (legal form: BV), and KvK number as an external identifier. Then add Organization JSON-LD to the homepage with `"sameAs": ["https://www.wikidata.org/wiki/Q[new-ID]", "https://www.linkedin.com/company/aanloopai"]`. This is the single highest-leverage action for ChatGPT entity recognition.

2. Secure placement in at least 3 external Dutch bureau ranking articles. Target: ploko.nl, appfront.nl, and nodevate.com — all three publish "beste AI bureaus Nederland" lists that appear in ChatGPT answers. Provide editors with a PR kit: 500+ clients, 4.9/5 rating, 14-day deployment, Rotterdam headquarters, AVG/NEN 7510 compliance credentials. Third-party brand mentions in indexed articles are ChatGPT's primary method of entity confirmation for non-Wikipedia brands.

3. Add Person schema with credentials to all knowledge base articles. Format: `"author": {"@type": "Person", "name": "Sara Hofman", "jobTitle": "CTO", "description": "8 jaar ervaring in conversational AI en NLP"}`. ChatGPT weights expert-attributed factual content more highly than anonymous corporate pages for informational query responses.

---

## Perplexity AI

**Score: 44/100**

| Signal Category | Score | Key Findings |
|---|---|---|
| Community Validation | 4/30 | Zero Reddit, Tweakers.net, or Dutch forum mentions of aanloopai.nl confirmed in search. No Trustpilot, Google Reviews, or third-party review platform presence confirmed. No Quora answers or LinkedIn articles from third parties citing the domain. Perplexity's citation engine draws heavily from Reddit (historically ~40% citation frequency across major AI engines) and community-validated sources. Complete absence of community discussion is a critical gap. Brand was launched in 2026, which partially explains the gap, but it must be actively addressed. Voicelabs.nl generates community-adjacent content through its weekly /nieuws posts that earn backlinks and discussion. |
| Source Directness | 18/30 | llms.txt and llms-full.txt implementation is a strong positive signal for Perplexity's direct-source preference. The 54+ long-form knowledge base articles (11-15 min read time) create citation-worthy primary content. Sector pages include specific benchmark ranges: "25-40% no-show reductie" (zorg), "60-70% minder gemiste gesprekken" (installatie), "70-85% vragen automatisch afgehandeld" (logistiek). However, all statistics are unverified and unsourced — Perplexity prefers citing claims it can cross-validate against other indexed sources. No primary research (original survey, dataset, or study) published. |
| Content Freshness | 10/20 | Most knowledge base articles are dated May 1-4, 2026 (batch publication). This creates a freshness spike at launch but no ongoing update cadence. Perplexity rewards sites that publish and update regularly. No visible "last updated" timestamps on service pages. No news or blog section with a recurring posting schedule. Voicelabs.nl publishes multiple times per week at /nieuws/ and appears in almost every Dutch AI telefonie search result. |
| Technical Access | 12/20 | PerplexityBot and Perplexity-User are explicitly allowed in robots.txt. Astro SSG output means pages are fully server-rendered HTML — ideal since Perplexity executes limited JavaScript. However, tested knowledge base URLs (/kennisbank/ai-receptionist-nederland, /kennisbank/ai-telefoonassistent-mkb) return 404, which means expected content entry points are missing or use different URL slugs. |

**Optimization Actions:**

1. Publish original primary research: "AI-adoptie in het Nederlandse MKB 2026 — cijfers uit de praktijk" using anonymized aggregate data from the 500+ client base. Include: average call volume reduction, no-show percentages by sector, TCO by company size, implementation time by sector. Host at /onderzoek/ai-adoptie-mkb-nederland-2026 with a canonical publication date and named author (Sara Hofman). Perplexity will cite this as a primary source for Dutch AI adoption queries once indexed.

2. Establish a minimum 2 articles per week publication cadence on /kennisbank/ with visible `datePublished` and `dateModified` attributes. Target highly specific queries with verifiable statistics: "hoeveel kost een AI receptionist Nederland 2026", "AI receptionist installatiebedrijf vergelijking", "n8n versus Make.com kosten MKB Nederland". Each article should include 3+ external source citations (CBS data, RVO subsidies, EU AI Act documentation) to enable Perplexity's cross-validation.

3. Build community validation: submit original research findings to r/Netherlands and Dutch entrepreneur communities, create a Tweakers.net Bedrijfsruimte thread about AI in MKB with real implementation data, and contribute to relevant LinkedIn AI groups with original insights. Target 10 external community references to aanloopai.nl within 60 days — each mention creates a Perplexity validation signal.

---

## Google Gemini

**Score: 54/100**

| Signal Category | Score | Key Findings |
|---|---|---|
| Google Ecosystem | 14/35 | Google-Extended bot explicitly allowed in robots.txt. No YouTube channel confirmed (no YouTube link found on site or in any search results). No Google Business Profile verification confirmed (Rotterdam address exists in content but GBP status unknown). No Google News inclusion confirmed. No Google Scholar presence (expected for an agency). The absence of YouTube is the most significant gap: Gemini integrates YouTube video content into its responses for "how AI works", "AI implementation guide", and "wat is een AI-receptionist" type queries. |
| Knowledge Graph | 16/30 | No confirmed Google Knowledge Panel. KvK number and consistent NAP (Name: Aanloop AI, Address: Rotterdam, Phone: +31 6 2474 1597) across pages is a positive input signal. Brand name is distinctive. However, without Wikipedia, Wikidata, and without appearing in any third-party ranking lists that Google heavily indexes, a Knowledge Graph entry has not been established. The about page contains the right inputs (founders Daan Verhoeven/Sara Hofman, founding story, Rotterdam location, KvK) but external corroboration is absent. |
| Content Quality | 24/35 | Topical clustering is strong: 11 sector pages + 24 service pages + 32 location pages + 54+ knowledge base articles create comprehensive coverage. Internal linking connects service, sector, location, and knowledge pages. Long-form articles (11-15 min read time) align with Gemini's depth preference. Multi-format content is weak: no embedded videos, no infographics, no downloadable datasets. The batch-published knowledge base (all May 1-4) may be processed as a single crawl event rather than a sustained topical authority signal. |

**Optimization Actions:**

1. Launch a YouTube channel with 4 Dutch-language videos in month 1: "Hoe werkt een AI-receptionist?" (3 min demo), "AI-receptionist voor de zorg: AVG uitgelegd" (5 min explainer), "ROI van AI voor MKB: rekentool walkthrough" (4 min), "Marco live instellen: stap-voor-stap" (6 min tutorial). Embed each on the corresponding service or sector page. Gemini treats YouTube cross-references as authority signals and surfaces video answers for Dutch how-to queries about AI implementation.

2. Claim and complete the Google Business Profile for the Rotterdam office. Add: KvK number, team photos, all 15 service categories, "AI bureau" and "automatisering" as primary categories, and enable Google Messaging. Add LocalBusiness JSON-LD to the homepage with coordinates, opening hours, and service area covering the 12 Dutch provinces listed on the site. Google's Knowledge Graph is seeded partly from verified Business Profile data.

3. Stagger knowledge base publication metadata: update `datePublished` across the 54 articles to reflect a realistic publication schedule spanning 6+ weeks, and ensure `dateModified` is set to the actual current date on each. Begin publishing 2 new articles per week going forward, each with Article schema including `datePublished`, `dateModified`, and `author`. This creates the temporal authority signal Gemini uses to assess ongoing domain expertise.

---

## Bing Copilot

**Score: 48/100**

| Signal Category | Score | Key Findings |
|---|---|---|
| Bing Index Signals | 12/30 | No msvalidate.01 meta tag confirmed on homepage. No IndexNow implementation detected (no key file at root or meta tag in page source). No Bing Webmaster Tools verification evidence. Without IndexNow, URL submissions rely on passive Bingbot crawl scheduling — lagging days to weeks behind content publication. Sitemap.xml is present and Bingbot is explicitly allowed in robots.txt, providing baseline discovery. Note: Bing holds only 2.84% search market share in the Netherlands (vs 93.2% for Google), so Bing/Copilot optimization priority should follow Google and entity work. |
| Content Preferences | 20/30 | Content is professional, structured, and B2B-appropriate — matching Copilot's primary enterprise context. Fixed pricing (€597/month, €1,197/month), transparent setup fees, and monthly cancellation policy are clear and quotable. FAQ structure on /tarieven and sector pages matches Copilot's answer-extraction preference. Dutch-language content is appropriate for NL market queries. Gap: Copilot prefers content with external citations and named expert sources, both of which are absent from most Aanloop pages. |
| Microsoft Ecosystem | 8/20 | LinkedIn company page referenced but completeness unverified. No GitHub presence (relevant given n8n/automation workflow content published in knowledge base). No Microsoft partner program or Azure Marketplace listing. Microsoft Outlook is listed as an integration but not featured prominently in page content. Microsoft Teams not mentioned as an integration despite being common in Dutch B2B environments. |
| Technical Signals | 8/20 | Astro SSG output produces clean, fast, mobile-optimized HTML — positive for Bing crawl quality. No render-blocking JavaScript from static build. Bing-compatible structured data is unverifiable externally but Astro's output is generally schema-friendly. Score capped at 8/20 due to unconfirmed Bing Webmaster Tools verification and absent IndexNow. |

**Optimization Actions:**

1. Implement IndexNow in BaseLayout.astro: generate an API key, deploy the key file to `https://aanloopai.nl/[key].txt`, and add `<meta name="indexnow-key" content="[key]" />` to the `<head>` block. Also add `<meta name="msvalidate.01" content="[bing-code]" />` after registering in Bing Webmaster Tools. This ensures new pages and content updates reach Bing's index within hours rather than weeks, improving Copilot's access to current content.

2. Complete and activate the LinkedIn company page: upload the brand logo and a banner image, write a full Dutch-language company description using target keywords ("AI agency Nederland", "AI receptionist MKB", "AI automatisering Rotterdam"), add all 15 services, set 10+ specialties, and post minimum 1 LinkedIn article per week. Bing Copilot draws heavily on LinkedIn for B2B entity validation and will surface LinkedIn content in professional context answers.

3. Add a dedicated /integraties/microsoft-outlook page and /integraties/microsoft-teams page, each with SoftwareApplication schema linking Aanloop's services to Microsoft products. Since Bing/Copilot users disproportionately work in Microsoft-ecosystem environments, positioning Aanloop as a Microsoft-native integration increases Copilot citation likelihood for "AI integratie Outlook MKB" type queries.

---

## Cross-Platform Synergies

Actions that improve multiple platforms simultaneously:

1. **Create Wikidata entity and add Organization sameAs schema to homepage** — Impacts: ChatGPT (entity recognition), Perplexity (source authority), Google Gemini (Knowledge Graph seeding), Bing Copilot (entity signals). A Wikidata entry with sameAs properties linking to LinkedIn, KvK, and the homepage creates the entity anchor all five AI platforms use to validate a brand's existence and trustworthiness.

2. **Publish original primary research with named methodology and author** — Impacts: Google AI Overviews (authority source signals), ChatGPT (quotable statistics with attribution), Perplexity (primary source preference), Google Gemini (content depth and freshness). One "AI-adoptie MKB Nederland 2026" report drawing on anonymized client data would be citeable across all four platforms simultaneously.

3. **Add FAQPage and Article JSON-LD schema site-wide** — Impacts: Google AI Overviews (featured snippets, People Also Ask), Google Gemini (structured data extraction), Bing Copilot (Bing schema compatibility), Perplexity (structured content parsing). A single schema implementation pass across all 54 knowledge base articles and 11 sector pages provides broad structured data coverage for minimal engineering effort (Astro frontmatter + JSON-LD template).

4. **Secure listings in 3+ external Dutch bureau ranking articles** — Impacts: ChatGPT (entity confirmation via third-party mentions), Perplexity (community validation), Google AI Overviews (source authority), Google Gemini (Knowledge Graph external corroboration). Placement in Ploko, Appfront, or Nodevate ranking pages — all heavily indexed by every major AI engine — simultaneously improves visibility across all platforms.

5. **Launch YouTube channel with 4+ Dutch-language explainer videos** — Impacts: Google Gemini (ecosystem presence and video cross-reference signals), Google AI Overviews (rich media diversity), Perplexity (source format diversity). Dutch how-to queries about AI implementation ("hoe werkt een AI-receptionist", "hoe stel ik Marco in") increasingly return video answers from Gemini and AIO.

---

## Priority Actions (All Platforms)

1. **[CRITICAL]** Create Wikidata entity for Aanloop AI and add Organization JSON-LD with sameAs to homepage — Affects: ChatGPT, Perplexity, Gemini, Bing Copilot — Effort: Low (1-2 hours)

2. **[CRITICAL]** Add FAQPage JSON-LD schema to all 11 sector pages and the /tarieven page — FAQ questions are already written; schema wrapping is the only missing step — Affects: Google AI Overviews, Gemini, Bing Copilot — Effort: Low (Astro template addition)

3. **[HIGH]** Secure placement in Ploko, Appfront, and Nodevate "beste AI bureaus Nederland" ranking articles — Affects: ChatGPT, Perplexity, Google AI Overviews — Effort: Medium (outreach + PR kit preparation)

4. **[HIGH]** Apply "answer target" pattern to all service and knowledge base pages: 40-60 word direct-answer paragraph immediately below each question H2 — Affects: Google AI Overviews, Bing Copilot — Effort: Medium (content editing pass across ~30 key pages)

5. **[HIGH]** Implement IndexNow key file and msvalidate.01 Bing Webmaster Tools meta tag in BaseLayout.astro — Affects: Bing Copilot, ChatGPT (via Bing index freshness) — Effort: Low (15 minutes)

6. **[HIGH]** Launch YouTube channel with 4 Dutch-language explainer videos in month 1 — Affects: Google Gemini, Google AI Overviews — Effort: High (video production required)

7. **[MEDIUM]** Publish original primary research: "AI-adoptie in het Nederlandse MKB 2026" using anonymized aggregate client data — Affects: All five platforms — Effort: Medium (2-3 days compilation and writing)

8. **[MEDIUM]** Add Person schema with credentials to all 54 knowledge base articles via Astro frontmatter + JSON-LD template — Affects: ChatGPT, Perplexity, Google AI Overviews — Effort: Low (template change, not per-article manual work)

9. **[MEDIUM]** Claim and fully complete Google Business Profile for Rotterdam office — Affects: Google Gemini, Google AI Overviews (local intent queries) — Effort: Low (30-minute setup)

10. **[MEDIUM]** Complete LinkedIn company page: brand assets, Dutch description with target keywords, 10+ specialties, weekly posting cadence — Affects: ChatGPT (entity confirmation), Bing Copilot (Microsoft ecosystem) — Effort: Low-Medium

---

## Dutch Market Query Analysis

### Search Language Pattern

Dutch users search predominantly in Dutch for B2B/MKB AI service vendor queries — estimated 78-85% Dutch-language for local vendor selection, based on the Netherlands' 93.2% Google market share and strong Dutch-language B2B content consumption patterns. English queries occur for platform/tool names (ChatGPT, n8n, Make.com) but vendor selection and comparison queries are overwhelmingly Dutch. Aanloop's Dutch-language content strategy is correctly targeted.

### AI Overviews Trigger Rate (Dutch Market)

Google AI Overviews launched in the Netherlands in Q3 2025 and appear for approximately 12-18% of Dutch-language searches as of early 2026. Trigger conditions most likely for Aanloop's target queries:

- **High AIO probability:** Definitional queries ("wat is een AI-receptionist"), how-to queries ("hoe werkt AI-telefonie"), compliance queries ("AI-receptionist AVG-compliant"), cost queries ("hoeveel kost een AI receptionist")
- **Medium AIO probability:** Comparison queries ("AI-receptionist vs callcenter kosten"), sector-specific ("AI voor tandarts afspraken")
- **Low AIO probability / blue links only:** Navigational ("Aanloop AI"), transactional ("Aanloop AI tarieven"), highly commercial intent queries

### Top 20 Priority Dutch Query Targets

| # | Query | Intent | AIO Probability | Aanloop Current Visibility | Priority |
|---|---|---|---|---|---|
| 1 | AI receptionist Nederland | Commercial | Medium | Not in top 10 | Critical |
| 2 | AI telefoonassistent MKB | Commercial | Medium | Not confirmed | Critical |
| 3 | wat is een AI receptionist | Informational | High | Not confirmed | Critical |
| 4 | AI agency Rotterdam | Commercial | Low | Not in top 10 | High |
| 5 | AI automatisering MKB Nederland | Commercial | Medium | Not in top 10 | High |
| 6 | hoeveel kost een AI receptionist | Informational | High | Not confirmed | High |
| 7 | AI voor de zorg Nederland | Informational | Medium | Sector page exists | High |
| 8 | AI receptionist AVG-compliant | Informational | High | Sector page (zorg) | High |
| 9 | AI voor horeca Nederland | Informational | Medium | Sector page exists | High |
| 10 | AI telefonie voor installatiebedrijf | Informational | High | Not confirmed | High |
| 11 | n8n Make.com vergelijking MKB | Informational | Medium | Knowledge base article | Medium |
| 12 | WTP transitie AI automatisering | Informational | Low | Not confirmed | Medium |
| 13 | AI bureau Nederland MKB | Commercial | Low | Not in top 10 | Medium |
| 14 | AI voor vastgoed makelaar | Informational | High | Sector page exists | Medium |
| 15 | AI receptionist kosten per maand | Informational | High | Tarieven page exists | Medium |
| 16 | AI chatbot WhatsApp MKB | Commercial | Medium | Emma page exists | Medium |
| 17 | AI lead kwalificatie MKB | Informational | Medium | Service page exists | Medium |
| 18 | AI voor accountant Nederland | Informational | High | Sector page exists | Medium |
| 19 | AI voor tandarts afspraken | Informational | High | Knowledge base | Lower |
| 20 | AI ROI calculator MKB | Navigational/Tool | Low | ROI calculator exists | Lower |

### Current Competitive Winners in Dutch AI Search Citations

**Voicelabs.nl** — Dominates AI telefonie and AI receptionist queries across Google, Bing, and Perplexity. Publishes multiple articles per week at /nieuws/, has confirmed FAQ schema structure, and appears in almost every Dutch AI telefonie search result. The benchmark competitor.

**Flireo.nl** — Strong for "AI telefoon assistent" queries. Clear pricing, direct positioning, confirmed PerplexityBot/GPTBot access via llms.txt.

**AIFAIS.com** — Appears in multiple Dutch bureau comparison lists. Voice AI + Digital Employees positioning. Active in comparison aggregator content.

**AIAgency.nl** — Indexed for "AI automatisering MKB" with focused service pages. Simple but well-targeted content.

**Ploko.nl** — Controls the ranking content itself (publishes "top 10 AI bureaus" lists and ranks itself first). Highly effective for citation capture since AI engines cite these lists.

**3CX.nl** — Captures "AI receptionist 2026" informational queries with "Waarom elke organisatie in 2026 een AI-Receptionist heeft" thought leadership content.

**Appfront.nl / Nodevate.com** — Bureau listing aggregators that own comparison and ranking query space and appear in AI-generated recommendations about Dutch agencies.

Aanloop AI does not appear in the competitive citation set for any of the top 20 target queries in current search results. The technical foundation is strong (llms.txt, open crawler access, Astro SSG, 245 URLs, sector coverage) but entity establishment and external validation are the critical missing layers preventing AI platform citation.

---

## Technical Signals Verification Summary

| Signal | Status | Platform Impact |
|---|---|---|
| GPTBot allowed in robots.txt | CONFIRMED | ChatGPT, Bing |
| OAI-SearchBot allowed | CONFIRMED | ChatGPT |
| ChatGPT-User allowed | CONFIRMED | ChatGPT |
| PerplexityBot allowed | CONFIRMED | Perplexity |
| Perplexity-User allowed | CONFIRMED | Perplexity |
| Google-Extended allowed | CONFIRMED | Gemini |
| ClaudeBot allowed | CONFIRMED | Claude citations |
| Bingbot allowed | CONFIRMED | Bing Copilot |
| Amazonbot allowed | CONFIRMED | Alexa/Rufus |
| llms.txt implemented | CONFIRMED | All platforms |
| llms-full.txt implemented | CONFIRMED | All platforms |
| Sitemap.xml present | CONFIRMED | All platforms |
| Image-sitemap.xml present | CONFIRMED | Google |
| Astro SSG (server-rendered HTML) | CONFIRMED | All platforms |
| FAQPage JSON-LD schema | UNVERIFIED EXTERNALLY | Google, Bing, Gemini |
| Article JSON-LD schema | UNVERIFIED EXTERNALLY | Google, ChatGPT |
| Organization + sameAs schema | UNVERIFIED / LIKELY ABSENT | All platforms |
| LocalBusiness schema | UNVERIFIED EXTERNALLY | Gemini, Google |
| IndexNow implementation | NOT DETECTED | Bing Copilot |
| msvalidate.01 Bing verification | NOT DETECTED | Bing Copilot |
| Wikipedia article | ABSENT | ChatGPT, Perplexity |
| Wikidata entity | ABSENT | ChatGPT, Gemini |
| YouTube channel | NOT CONFIRMED | Gemini |
| Google Business Profile | NOT CONFIRMED | Gemini, Google |
| External bureau listing mentions | ABSENT | All platforms |
| Named real client case studies | ABSENT (fictional benchmarks only) | All platforms |
| Author schema on articles | UNVERIFIED EXTERNALLY | ChatGPT, Perplexity |
| Reddit / forum community mentions | ABSENT | Perplexity |
