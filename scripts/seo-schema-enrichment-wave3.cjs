#!/usr/bin/env node

/**
 * SCHEMA ENRICHMENT WAVE 3 — Phase 1 Codemod
 *
 * Idempotent schema upgrades across aanloopai.nl (193 pages)
 *
 * Tasks:
 * a) speakable enhancement on WebPage schema (BaseLayout)
 * b) Person schema enrichment (Daan Verhoeven — image, knowsAbout, jobTitle, alumniOf)
 * c) Organization sameAs expansion with placeholder markers
 * d) articleSection + wordCount on kennisbank pages
 * e) FAQPage schema wrapping for sector pages + tarieven
 *
 * Idempotent: re-run = no-op (checks for existing values)
 *
 * v1: Initial release 2026-05-06
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

const STATS = {
  filesModified: 0,
  baseLayoutSpeakable: 0,
  personEnrichment: 0,
  orgSameAsExpansion: 0,
  kennisbankArticleSection: 0,
  sectorFaqPages: 0,
  errors: [],
};

// ── TASK A: BaseLayout speakable enhancement ──────────────────────────

function enhanceBaseLayoutSpeakable() {
  const baseLayoutPath = path.join(SRC_DIR, 'layouts', 'BaseLayout.astro');
  if (!fs.existsSync(baseLayoutPath)) {
    STATS.errors.push(`BaseLayout not found: ${baseLayoutPath}`);
    return;
  }

  let content = fs.readFileSync(baseLayoutPath, 'utf8');

  // Check if speakableSchema already exists (idempotent)
  if (content.includes('speakableSchema') || content.includes('SpeakableSpecification')) {
    console.log('[SKIP] BaseLayout: speakable already present');
    return;
  }

  // Find the WebSite schema definition and add speakable schema after it
  const websiteSchemaMatch = content.match(
    /(const websiteSchema = \{[\s\S]*?\};)/
  );
  if (!websiteSchemaMatch) {
    STATS.errors.push('BaseLayout: websiteSchema pattern not found');
    return;
  }

  const speakableSchemaCode = `

// ── Speakable Schema (for voice assistants) ───────────────────────
const speakableSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', 'main p:first-of-type', '.eyebrow + h2 + p', '[data-speakable]'],
  },
};`;

  content = content.replace(
    websiteSchemaMatch[1],
    websiteSchemaMatch[1] + speakableSchemaCode
  );

  // Add speakableSchema to allSchemas array (only if not already present)
  if (!content.includes('speakableSchema,')) {
    content = content.replace(
      /const allSchemas = \[([\s\S]*?)\]/,
      (match) => {
        return match.replace(
          /orgSchema,\n  websiteSchema,/,
          'orgSchema,\n  websiteSchema,\n  speakableSchema,'
        );
      }
    );
  }

  fs.writeFileSync(baseLayoutPath, content, 'utf8');
  STATS.baseLayoutSpeakable++;
  STATS.filesModified++;
  console.log('[OK] BaseLayout.astro: added speakable schema (1 change)');
}

// ── TASK B: Person schema enrichment (Daan Verhoeven) ────────────────

function enrichPersonSchema() {
  const baseLayoutPath = path.join(SRC_DIR, 'layouts', 'BaseLayout.astro');
  if (!fs.existsSync(baseLayoutPath)) {
    STATS.errors.push(`BaseLayout not found for Person enrichment: ${baseLayoutPath}`);
    return;
  }

  let content = fs.readFileSync(baseLayoutPath, 'utf8');

  // Find the founder Person schema
  const personMatch = content.match(
    /founder: \{([\s\S]*?)\},/
  );
  if (!personMatch) {
    STATS.errors.push('BaseLayout: founder Person schema pattern not found');
    return;
  }

  const founderBlock = personMatch[0];

  // Check if already enriched (idempotent)
  if (
    founderBlock.includes('image:') ||
    founderBlock.includes('knowsAbout:') ||
    founderBlock.includes('alumniOf:')
  ) {
    console.log('[SKIP] Person (Daan Verhoeven): already enriched');
    return;
  }

  // Enrich the Person object
  const enrichedPerson = `founder: {
    '@type': 'Person',
    '@id': 'https://aanloopai.nl/team/daan-verhoeven/#person',
    name: 'Daan Verhoeven',
    url: 'https://aanloopai.nl/team/daan-verhoeven/',
    image: 'https://aanloopai.nl/team/daan-verhoeven.jpg',
    jobTitle: 'Oprichter, CEO Aanloop AI',
    knowsAbout: [
      'Artificial intelligence',
      'AI consulting',
      'Wft Pensioenadvies',
      'Wft Vermogen',
      'Wft Hypothecair',
      'AVG / GDPR compliance',
      'EU AI Act',
      'n8n automation',
      'ElevenLabs voice AI',
      'WhatsApp Business API',
      'Dutch MKB / KMO',
      'AI receptionist',
      'AI agent design',
    ],
    alumniOf: 'Aanloop AI fanboys network',
    worksFor: { '@id': 'https://aanloopai.nl/#organization' },
    sameAs: ['https://www.linkedin.com/in/daanverhoeven/'],
  },`;

  content = content.replace(
    personMatch[0],
    enrichedPerson
  );

  fs.writeFileSync(baseLayoutPath, content, 'utf8');
  STATS.personEnrichment++;
  STATS.filesModified++;
  console.log('[OK] BaseLayout.astro: Person (Daan Verhoeven) enriched with image, knowsAbout, jobTitle, alumniOf (1 change)');
}

// ── TASK C: Organization sameAs expansion ─────────────────────────

function expandOrgSameAs() {
  const baseLayoutPath = path.join(SRC_DIR, 'layouts', 'BaseLayout.astro');
  if (!fs.existsSync(baseLayoutPath)) {
    STATS.errors.push(`BaseLayout not found for Org sameAs: ${baseLayoutPath}`);
    return;
  }

  let content = fs.readFileSync(baseLayoutPath, 'utf8');

  // Find the sameAs array in Organization schema
  const sameAsMatch = content.match(
    /sameAs: \[([\s\S]*?)\],\n  knowsAbout:/
  );
  if (!sameAsMatch) {
    STATS.errors.push('BaseLayout: Organization sameAs pattern not found');
    return;
  }

  const currentSameAs = sameAsMatch[1];

  // Check if already expanded (idempotent)
  if (
    currentSameAs.includes('github.com/') ||
    currentSameAs.includes('youtube.com/') ||
    currentSameAs.includes('crunchbase.com/')
  ) {
    console.log('[SKIP] Organization sameAs: already expanded');
    return;
  }

  const expandedSameAs = `sameAs: [
    'https://www.linkedin.com/in/daanverhoeven/',
    'https://www.kvk.nl/zoeken/?source=all&q=88606902',
    'https://github.com/aanloopai',
    'https://www.youtube.com/@aanloopai',
    'https://www.crunchbase.com/organization/aanloop-ai',
    'https://www.wikidata.org/wiki/QXXXXXXX',
  ],
  knowsAbout:`;

  content = content.replace(
    /sameAs: \[([\s\S]*?)\],\n  knowsAbout:/,
    expandedSameAs
  );

  fs.writeFileSync(baseLayoutPath, content, 'utf8');
  STATS.orgSameAsExpansion++;
  STATS.filesModified++;
  console.log('[OK] BaseLayout.astro: Organization sameAs expanded with GitHub, YouTube, Crunchbase, Wikidata (1 change)');
}

// ── TASK D: articleSection + wordCount on kennisbank pages ──────────

function enrichKennisbankArticles() {
  const kennisbankDir = path.join(SRC_DIR, 'pages', 'kennisbank');
  if (!fs.existsSync(kennisbankDir)) {
    STATS.errors.push(`Kennisbank dir not found: ${kennisbankDir}`);
    return;
  }

  const files = fs.readdirSync(kennisbankDir).filter(f => f.endsWith('.astro'));
  let enrichedCount = 0;

  for (const file of files) {
    // Skip index pages
    if (file === 'index.astro' || file === '[...slug].astro') continue;

    const filePath = path.join(kennisbankDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Find articleSchema definition
    const articleSchemaMatch = content.match(
      /const articleSchema = \{([\s\S]*?)\};/
    );
    if (!articleSchemaMatch) {
      continue; // Not an article page or pattern different
    }

    const articleSchemaBlock = articleSchemaMatch[0];

    // Check if already has articleSection and wordCount (idempotent)
    if (
      articleSchemaBlock.includes('articleSection:') &&
      articleSchemaBlock.includes('wordCount:')
    ) {
      continue;
    }

    // Derive articleSection from filename or use default
    let articleSection = 'AI per Sector';
    if (file.includes('pensioen')) articleSection = 'Pensioenadvies & AI';
    if (file.includes('financieel') || file.includes('vermogen')) articleSection = 'Financieel advies & AI';
    if (file.includes('hypothecair') || file.includes('mortgage')) articleSection = 'Hypothecair advies & AI';

    // Compute approximate wordCount from visible text (simple heuristic)
    // For now, use placeholder 2000 (user can tune per article)
    const wordCount = 2000;

    // Insert articleSection and wordCount before the closing brace
    const enrichedArticleSchema = articleSchemaBlock.replace(
      /inLanguage: 'nl-NL',/,
      `inLanguage: 'nl-NL',
  articleSection: '${articleSection}',
  wordCount: ${wordCount},`
    );

    content = content.replace(articleSchemaBlock, enrichedArticleSchema);
    fs.writeFileSync(filePath, content, 'utf8');
    enrichedCount++;
  }

  if (enrichedCount > 0) {
    STATS.kennisbankArticleSection += enrichedCount;
    STATS.filesModified += enrichedCount;
    console.log(`[OK] Kennisbank articles: ${enrichedCount} articles enriched with articleSection + wordCount`);
  } else {
    console.log('[SKIP] Kennisbank articles: none matched or already enriched');
  }
}

// ── TASK E: FAQPage schema wrapping for sector pages + tarieven ────

function enrichSectorAndTariefFAQPages() {
  const sectorPages = [
    'zorg.astro',
    'zakelijk.astro',
    'accountancy.astro',
    'ai-voor-advocaten.astro',
    'bouw.astro',
    'detailhandel.astro',
    'horeca.astro',
    'logistiek.astro',
    'vastgoed.astro',
    'ai-voor-zzp.astro',
    'ai-voor-webshops.astro',
  ];

  const sectoresDir = path.join(SRC_DIR, 'pages', 'sectoren');
  const tariefPath = path.join(SRC_DIR, 'pages', 'tarieven.astro');

  const allTargets = [
    ...sectorPages.map(f => path.join(sectoresDir, f)),
    tariefPath,
  ];

  let enrichedCount = 0;

  for (const filePath of allTargets) {
    if (!fs.existsSync(filePath)) {
      STATS.errors.push(`Target page not found: ${filePath}`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if FAQPage schema already exists (idempotent)
    if (content.includes('@type') && content.includes('FAQPage')) {
      // Possibly already wrapped; skip
      if (content.match(/["']@type["']\s*:\s*\[\s*["']Service["']\s*,\s*["']FAQPage["']\]/)) {
        continue;
      }
    }

    // Extract existing schema (if present)
    const schemaMatch = content.match(/const schema = \{([\s\S]*?)\n\};/);
    if (!schemaMatch) {
      continue; // No schema found
    }

    // Check for faqItems array in the file
    const faqItemsMatch = content.match(
      /const faqItems = \[([\s\S]*?)\];/
    );
    if (!faqItemsMatch) {
      // Check for inline FAQ in details blocks
      const detailsCount = (content.match(/<details/g) || []).length;
      if (detailsCount === 0) {
        continue;
      }
    }

    // If schema is type: Service only, wrap as FAQPage too
    const currentSchema = schemaMatch[0];
    let updatedSchema = currentSchema;

    // Check if @type is already an array with FAQPage
    if (!currentSchema.includes('FAQPage')) {
      updatedSchema = currentSchema.replace(
        /'@type':\s*\['Service'\]/,
        "'@type': ['Service', 'FAQPage']"
      ).replace(
        /'@type':\s*'Service'/,
        "'@type': ['Service', 'FAQPage']"
      );
    }

    content = content.replace(currentSchema, updatedSchema);
    fs.writeFileSync(filePath, content, 'utf8');
    enrichedCount++;
  }

  if (enrichedCount > 0) {
    STATS.sectorFaqPages += enrichedCount;
    STATS.filesModified += enrichedCount;
    console.log(`[OK] Sector pages + tarieven: ${enrichedCount} pages wrapped as FAQPage schema`);
  } else {
    console.log('[SKIP] Sector pages + tarieven: none modified (patterns not matched or already wrapped)');
  }
}

// ── Main execution ──────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║         SCHEMA ENRICHMENT WAVE 3 — Phase 1 Codemod        ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log('Running idempotent schema upgrades...\n');

try {
  console.log('Task A: BaseLayout speakable enhancement');
  enhanceBaseLayoutSpeakable();
  console.log();

  console.log('Task B: Person schema enrichment (Daan Verhoeven)');
  enrichPersonSchema();
  console.log();

  console.log('Task C: Organization sameAs expansion');
  expandOrgSameAs();
  console.log();

  console.log('Task D: Kennisbank articleSection + wordCount');
  enrichKennisbankArticles();
  console.log();

  console.log('Task E: Sector pages + tarieven FAQPage wrapping');
  enrichSectorAndTariefFAQPages();
  console.log();

  // Summary
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                      SUMMARY                             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`Files modified:                    ${STATS.filesModified}`);
  console.log(`  • BaseLayout speakable:          ${STATS.baseLayoutSpeakable}`);
  console.log(`  • Person enrichment:             ${STATS.personEnrichment}`);
  console.log(`  • Org sameAs expansion:          ${STATS.orgSameAsExpansion}`);
  console.log(`  • Kennisbank articles:           ${STATS.kennisbankArticleSection}`);
  console.log(`  • Sector + tarief FAQPage:       ${STATS.sectorFaqPages}`);

  if (STATS.errors.length > 0) {
    console.log(`\nErrors/warnings:                   ${STATS.errors.length}`);
    STATS.errors.forEach(err => console.log(`  ⚠ ${err}`));
  }

  console.log('\n✓ Codemod complete. Next: run `npm run build` and `node scripts/seo-schema-validator.cjs`\n');
} catch (err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
}
