// Website → intake-prefill. Pure helpers, geen fetch hier (de Worker haalt de
// pagina op, zie handleIntakePrefill in worker.js).
//
// Waarom (onboarding-onderzoek 2026-09-15): Voicelabs, Dialzara, Rosie en
// Loekas laten een nieuwe klant eerst zijn eigen website invoeren en vullen
// daaruit naam/telefoon/openingstijden in — "live in 15 minuten". Ons /start/
// begon met een leeg formulier. Deze module haalt alleen wat letterlijk op de
// pagina staat; een ontbrekend veld blijft leeg, er wordt niets verzonnen.

const MAX_NAME = 120;
const MAX_HOURS = 400;

const DAY_NL = {
  monday: 'Ma', tuesday: 'Di', wednesday: 'Wo', thursday: 'Do',
  friday: 'Vr', saturday: 'Za', sunday: 'Zo',
};

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(s) {
  return decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Nederlands nummer → E.164 (+31…). Leeg als het geen NL-nummer lijkt. */
export function normalizeNlPhone(raw) {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  if (d.startsWith('+31')) d = d.slice(3);
  else if (d.startsWith('+')) return ''; // buitenlands nummer: niet raden
  else if (d.startsWith('0')) d = d.slice(1);
  if (!/^\d{9}$/.test(d)) return '';
  return `+31${d}`;
}

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? m[1] : '';
}

function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const list = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
      for (const node of list) if (node && typeof node === 'object') out.push(node);
    } catch { /* kapotte JSON-LD is geen reden om te falen */ }
  }
  return out;
}

function hoursFromSpec(spec) {
  const list = Array.isArray(spec) ? spec : [spec];
  const lines = [];
  for (const s of list) {
    if (!s || typeof s !== 'object') continue;
    const days = (Array.isArray(s.dayOfWeek) ? s.dayOfWeek : [s.dayOfWeek])
      .filter(Boolean)
      .map((d) => DAY_NL[String(d).split('/').pop().toLowerCase()] || '')
      .filter(Boolean);
    if (!days.length || !s.opens || !s.closes) continue;
    lines.push(`${days.join(', ')} ${String(s.opens).slice(0, 5)}-${String(s.closes).slice(0, 5)}`);
  }
  return lines.join('; ');
}

function cleanTitle(title) {
  const t = stripTags(title);
  // "Fysio De Brug | Fysiotherapie in Rotterdam" → "Fysio De Brug"
  const first = t.split(/\s[|–—·]\s|\s-\s|:\s/)[0].trim();
  return (first || t).slice(0, MAX_NAME);
}

/**
 * @param {string} html
 * @param {string} url  bron-URL (alleen meegegeven in het resultaat)
 * @returns {{ bedrijfsnaam: string, telefoon: string, openingstijden: string, kvk: string, bron: string }}
 */
export function extractBusinessFacts(html, url) {
  const src = String(html || '');
  const ld = jsonLdBlocks(src);

  let bedrijfsnaam = stripTags(firstMatch(src, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || firstMatch(src, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i));
  if (!bedrijfsnaam) {
    const ldName = ld.map((n) => n.name).find((n) => typeof n === 'string' && n.trim());
    if (ldName) bedrijfsnaam = stripTags(ldName);
  }
  if (!bedrijfsnaam) bedrijfsnaam = cleanTitle(firstMatch(src, /<title[^>]*>([\s\S]*?)<\/title>/i));
  bedrijfsnaam = bedrijfsnaam.slice(0, MAX_NAME);

  let telefoon = '';
  const telHref = firstMatch(src, /href=["']tel:([^"']+)["']/i);
  if (telHref) telefoon = normalizeNlPhone(decodeURIComponent(telHref));
  if (!telefoon) {
    const ldTel = ld.map((n) => n.telephone).find((t) => typeof t === 'string' && t.trim());
    if (ldTel) telefoon = normalizeNlPhone(ldTel);
  }
  if (!telefoon) {
    const text = stripTags(src);
    const m = text.match(/(?:\+31|0031|\b0)[\s-]?(?:\d[\s-]?){8,9}\d/);
    if (m) telefoon = normalizeNlPhone(m[0]);
  }

  let openingstijden = '';
  for (const n of ld) {
    if (n.openingHoursSpecification) openingstijden = hoursFromSpec(n.openingHoursSpecification);
    else if (typeof n.openingHours === 'string') openingstijden = n.openingHours;
    else if (Array.isArray(n.openingHours)) openingstijden = n.openingHours.join('; ');
    if (openingstijden) break;
  }
  openingstijden = String(openingstijden).slice(0, MAX_HOURS);

  const kvk = firstMatch(stripTags(src), /\bK\.?v\.?K\.?(?:[\s-]*(?:nummer|nr\.?))?[\s:.-]*(\d{8})\b/i);

  return { bedrijfsnaam, telefoon, openingstijden, kvk, bron: String(url || '') };
}

/** "fysiodebrug.nl" → "https://fysiodebrug.nl/"; query/hash weg. */
export function normalizeSiteUrl(input) {
  let s = String(input || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '';
  }
}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|intranet|[^.]+)$/i;
const PRIVATE_IP = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|\[?fc|\[?fd|\[?fe80)/i;

/** SSRF-gate: alleen http(s), publieke hostnaam met een punt, geen IP, geen poort, geen user:pw. */
export function isFetchableSiteUrl(input) {
  let u;
  try { u = new URL(String(input || '')); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password || u.port) return false;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!host || PRIVATE_HOST.test(host)) return false;
  if (/^[\d.]+$/.test(host) || host.includes(':')) return false; // IPv4 / IPv6 letterlijk
  if (PRIVATE_IP.test(host)) return false;
  return true;
}
