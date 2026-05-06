/**
 * IndexNow API Configuration
 *
 * IndexNow is an open protocol (Microsoft/Yandex) that allows sites to notify
 * search engines of new/changed URLs instantly via HTTP POST.
 *
 * Benefits:
 * - Reduces indexing latency from days to minutes for Bing + Yandex
 * - Propagates to Google, Baidu, DuckDuckGo via the network
 * - Simple: just POST a list of URLs + a verification key
 *
 * Setup:
 * 1. Key is placed in public/{key}.txt (Bing verification requirement)
 * 2. Use scripts/indexnow-ping.cjs to notify search engines
 * 3. Typically called post-publish (e.g., after astro build + deploy)
 *
 * More: https://www.indexnow.org/
 */

export const INDEXNOW_KEY = 'e336017952984cce846f0b055c795108';
export const INDEXNOW_HOST = 'aanloopai.nl';
export const INDEXNOW_API_ENDPOINT = 'https://api.indexnow.org/indexnow';
