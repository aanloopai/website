#!/usr/bin/env node

/**
 * RECIPE: SEO Internal Linking Wave 3 — Cluster Cross-linking Densification
 * FLOW: kennisbank/*.astro → identify pillar → map to cluster → inject contextual cross-links
 *
 * VERSION HISTORY:
 * v1 (current): Phase 3 implementation — 5+ inbound/outbound per pillar, idempotent injection
 *
 * API LEARNINGS:
 * - Astro: File I/O via fs/promises; content sections use regex-safe patterns
 * - Link patterns: Use `<a href="/kennisbank/..."` for grep safety
 *
 * KNOWN ISSUES:
 * - Dynamic Astro loops ({array.map}) not modified; static content only
 * - Footer dynamic links handled separately in BaseLayout
 */

const fs = require('fs');
const path = require('path');

// Define topic clusters: key -> {hub, siblings, services, sectors}
const clusters = {
  'ai-automatisering': {
    hub: '/kennisbank/ai-automatisering-mkb/',
    siblings: [
      '/kennisbank/ai-workflow-automation/',
      '/kennisbank/ai-agent-voorbeelden/',
      '/kennisbank/ai-implementatie-stappen-mkb-nederland/',
    ],
    services: ['/diensten/', '/diensten/marco/', '/diensten/emma/'],
    sectors: ['/sectoren/horeca/', '/sectoren/accountancy/', '/sectoren/zorg/'],
  },
  'ai-receptionist': {
    hub: '/diensten/ai-receptionist/',
    siblings: [
      '/kennisbank/ai-no-show-reductie-mkb-nederland/',
      '/kennisbank/ai-agent-kosten-mkb/',
    ],
    services: ['/diensten/marco/', '/diensten/afspraken/'],
    sectors: ['/sectoren/zorg/', '/sectoren/horeca/', '/sectoren/vastgoed/'],
  },
  'whatsapp-ai': {
    hub: '/diensten/emma/',
    siblings: [
      '/kennisbank/ai-klantenservice-voor-mkb-2026/',
      '/kennisbank/ai-meertalige-klantenservice-mkb-nederland-2026/',
    ],
    services: ['/diensten/', '/diensten/ai-receptionist/'],
    sectors: ['/sectoren/horeca/', '/sectoren/webshop/', '/sectoren/logistiek/'],
  },
  'ai-compliance': {
    hub: '/kennisbank/',
    siblings: [
      '/kennisbank/ai-avg-gdpr-compliance-mkb-nederland/',
      '/kennisbank/ai-hr-sollicitatie-screening-avg-eu-ai-act/',
    ],
    services: ['/diensten/', '/gratis-ai-scan/'],
    sectors: ['/sectoren/zorg/', '/sectoren/financieel/', '/sectoren/juridisch/'],
  },
  'ai-finance': {
    hub: '/sectoren/financieel/',
    siblings: [
      '/kennisbank/ai-cashflow-prognose-finance-mkb-nederland-2026/',
      '/kennisbank/ai-facturering-automatisering/',
    ],
    services: ['/diensten/', '/ai-roi-calculator/'],
    sectors: ['/sectoren/accountancy/', '/sectoren/pensioen/'],
  },
};

// Map pillar filename patterns to cluster keys
const mapPillarToCluster = (fileName) => {
  if (fileName.includes('automatisering')) return 'ai-automatisering';
  if (fileName.includes('no-show') || fileName.includes('afspraken')) return 'ai-receptionist';
  if (fileName.includes('whatsapp') || fileName.includes('klantenservice')) return 'whatsapp-ai';
  if (fileName.includes('avg') || fileName.includes('compliance') || fileName.includes('eu-ai-act')) return 'ai-compliance';
  if (fileName.includes('cashflow') || fileName.includes('facturering') || fileName.includes('finance')) return 'ai-finance';
  return 'ai-automatisering'; // default fallback
};

const generateRelatedSection = (links) => {
  const html = `
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
            <p class="text-sm font-bold text-navy mb-3">Gerelateerde kennisbank artikelen</p>
            <ul class="space-y-2">
${links.map(link => `              <li><a href="${link.url}" class="text-sm text-brand-indigo hover:underline">${link.title} →</a></li>`).join('\n')}
            </ul>
          </div>`;
  return html;
};

async function processFile(filePath, fileName) {
  try {
    let content = await fs.promises.readFile(filePath, 'utf-8');

    // Idempotent check: skip if "Gerelateerde kennisbank" already present
    if (content.includes('Gerelateerde kennisbank')) {
      return { file: fileName, status: 'skipped', reason: 'already has related section' };
    }

    // Determine cluster for this pillar
    const clusterKey = mapPillarToCluster(fileName);
    const cluster = clusters[clusterKey];

    if (!cluster) {
      return { file: fileName, status: 'skipped', reason: 'cluster not mapped' };
    }

    // Build cross-link list (5+ total)
    const links = [];

    // Add 2 siblings
    if (cluster.siblings && cluster.siblings.length > 0) {
      links.push({
        url: cluster.siblings[0],
        title: 'Meer over AI agents',
      });
      if (cluster.siblings.length > 1) {
        links.push({
          url: cluster.siblings[1],
          title: 'AI implementatie stappen',
        });
      }
    }

    // Add hub (if not homepage)
    if (cluster.hub && cluster.hub !== '/') {
      links.push({
        url: cluster.hub,
        title: 'Terug naar hub',
      });
    }

    // Add 1 service page
    if (cluster.services && cluster.services.length > 0) {
      links.push({
        url: cluster.services[0],
        title: 'Bekijk onze diensten',
      });
    }

    // Add 1 sector page
    if (cluster.sectors && cluster.sectors.length > 0) {
      links.push({
        url: cluster.sectors[0],
        title: 'Relevant voor uw sector',
      });
    }

    // Find injection point: before </article> closing tag
    const injectionMatch = content.indexOf('</article>');
    if (injectionMatch === -1) {
      return { file: fileName, status: 'skipped', reason: 'no </article> tag found' };
    }

    // Inject the new section
    const newContent =
      content.slice(0, injectionMatch) +
      generateRelatedSection(links.slice(0, 5)) +
      content.slice(injectionMatch);

    await fs.promises.writeFile(filePath, newContent, 'utf-8');

    return {
      file: fileName,
      status: 'updated',
      linksAdded: links.slice(0, 5).length,
      cluster: clusterKey,
    };
  } catch (err) {
    return {
      file: fileName,
      status: 'error',
      error: err.message,
    };
  }
}

async function main() {
  console.log('🔗 SEO Internal Linking Wave 3 — Phase 3 Densification\n');

  const kennisbankDir = path.join(
    __dirname,
    '../src/pages/kennisbank',
  );

  // Read kennisbank .astro files from directory
  const allFiles = fs.readdirSync(kennisbankDir);
  const files = allFiles.filter(f => f.endsWith('.astro'));
  console.log(`Found ${files.length} kennisbank pillars.\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const results = [];

  for (const file of files) {
    const fileName = file.replace('.astro', '');
    const filePath = path.join(kennisbankDir, file);
    const result = await processFile(filePath, fileName);

    results.push(result);

    if (result.status === 'updated') {
      updated++;
      console.log(`  ✓ ${fileName}: +${result.linksAdded} links`);
    } else if (result.status === 'skipped') {
      skipped++;
    } else if (result.status === 'error') {
      errors++;
      console.log(`  ✗ ${fileName}: ${result.error}`);
    }
  }

  console.log(`\n✅ Complete:`);
  console.log(`  Updated: ${updated} pillars`);
  console.log(`  Total contextual links added: ${updated * 5} (5 per pillar)`);
  console.log(`  Skipped: ${skipped} (already have related section)`);
  console.log(`  Errors: ${errors}`);

  // Show sample
  const sampleUpdated = results.filter(r => r.status === 'updated').slice(0, 3);
  if (sampleUpdated.length > 0) {
    console.log(`\nSample updates:`);
    sampleUpdated.forEach(r => {
      console.log(`  - ${r.file} (cluster: ${r.cluster})`);
    });
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
