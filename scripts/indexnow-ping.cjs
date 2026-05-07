#!/usr/bin/env node

/**
 * IndexNow Ping Script
 *
 * Reads sitemap.xml, extracts all URLs, and notifies IndexNow API
 * (Bing/Yandex) of new/changed content for instant indexing.
 *
 * Usage:
 *   node scripts/indexnow-ping.cjs
 *   npm run indexnow
 *
 * Typical flow:
 *   1. astro build (generates dist/sitemap.xml)
 *   2. Deploy site
 *   3. Run this script to notify search engines
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Config
const INDEXNOW_KEY = 'e336017952984cce846f0b055c795108';
const INDEXNOW_HOST = 'aanloopai.nl';
const INDEXNOW_API_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP_PATH = path.join(__dirname, '../dist/sitemap.xml');

/**
 * Extract URLs from sitemap.xml using regex
 * Simple approach: extract all <loc>...</loc> tags
 */
function extractUrlsFromSitemap() {
  try {
    const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const urlMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g);

    if (!urlMatches) {
      return [];
    }

    const urls = urlMatches.map((match) =>
      match.replace(/<\/?loc>/g, '')
    );
    return urls;
  } catch (error) {
    const AUTO_MODE = process.env.INDEXNOW_PING === '1' || process.env.CF_PAGES === '1';
    console.error('[ERROR] Failed to parse sitemap:', error.message);
    process.exit(AUTO_MODE ? 0 : 1);
  }
}

/**
 * POST to IndexNow API
 */
function postToIndexNow(payload) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(payload);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json),
      },
    };

    const req = https.request(INDEXNOW_API_ENDPOINT, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // IndexNow returns 200 or 202 (Accepted) on success
        if (res.statusCode === 200 || res.statusCode === 202) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(
            new Error(
              `API returned status ${res.statusCode}: ${data}`
            )
          );
        }
      });
    });

    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  // Auto-mode = invoked from postbuild via env trigger; never break build on failure.
  const AUTO_MODE = process.env.INDEXNOW_PING === '1' || process.env.CF_PAGES === '1';
  const SCRIPT_INVOCATION = process.env.npm_lifecycle_event || 'manual';

  if (SCRIPT_INVOCATION === 'postbuild' && !AUTO_MODE) {
    console.log('[IndexNow] postbuild auto-skip (set CF_PAGES=1 or INDEXNOW_PING=1 to enable)');
    process.exit(0);
  }

  console.log('[IndexNow] Extracting URLs from sitemap...');
  const urls = extractUrlsFromSitemap();
  console.log(`[IndexNow] Found ${urls.length} URLs`);

  if (urls.length === 0) {
    console.warn('[WARN] No URLs found in sitemap');
    if (AUTO_MODE) process.exit(0);
    return;
  }

  // IndexNow supports max 10,000 URLs per request
  const maxUrls = 10000;
  const urlsToSubmit = urls.slice(0, maxUrls);

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${INDEXNOW_HOST}/e336017952984cce846f0b055c795108.txt`,
    urlList: urlsToSubmit,
  };

  console.log(`[IndexNow] Posting ${urlsToSubmit.length} URLs to ${INDEXNOW_API_ENDPOINT}...`);

  try {
    const result = await postToIndexNow(payload);
    console.log(`[SUCCESS] IndexNow API returned ${result.status}`);
    console.log(`[INFO] All ${urlsToSubmit.length} URLs submitted for indexing`);
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] IndexNow API request failed:', error.message);
    // In AUTO_MODE never break build — IndexNow will retry on next build/push.
    process.exit(AUTO_MODE ? 0 : 1);
  }
}

main();
