#!/usr/bin/env node
// Postbuild: dedupliceert herhaalde inline-SVG's per pagina.
//
// Aanleiding: Semrush meldde 47 pagina's met een lage text-HTML-ratio. De
// bytes zitten niet in whitespace (compressHTML doet zijn werk) maar in
// markup: Tailwind class-attributen (~35%) en inline SVG (~20%). Op /tarieven/
// staan 152 svg-elementen waarvan er maar 23 uniek zijn — hetzelfde vinkje
// staat er 45 keer voluit in.
//
// Deze stap laat het buitenste <svg> met al zijn attributen (class, size,
// aria-*) staan en vervangt alleen de inhoud door <use href="#...">. De
// symbolen komen één keer per pagina in een verborgen sprite vlak voor
// </body>. Fill en stroke zijn overerfbare presentatie-attributen, dus
// currentColor-iconen blijven meekleuren met hun container.
//
// Bewust een build-stap en geen bronwijziging: de componenten blijven leesbaar
// met hun eigen svg, en één `npm run build` zonder deze stap levert gewoon de
// oude, werkende HTML op.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const SVG_RE = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/gi;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const attr = (attrs, name) => {
  const m = attrs.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
};

function processFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('</body>')) return null;

  // Ronde 1: tellen welke inhoud vaker dan eens voorkomt.
  const counts = new Map();
  for (const m of html.matchAll(SVG_RE)) {
    const inner = m[2].trim();
    // Een svg die zelf al een <use> bevat of leeg is, valt af.
    if (!inner || inner.includes('<use')) continue;
    const key = `${attr(m[1], 'viewBox') || ''}|${inner}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const ids = new Map();
  for (const [key, n] of counts) if (n > 1) ids.set(key, `ai-icon-${ids.size + 1}`);
  if (!ids.size) return null;

  // Ronde 2: vervangen en symbolen verzamelen.
  const symbols = new Map();
  const out = html.replace(SVG_RE, (full, attrs, inner) => {
    const body = inner.trim();
    if (!body || body.includes('<use')) return full;
    const viewBox = attr(attrs, 'viewBox') || '';
    const key = `${viewBox}|${body}`;
    const id = ids.get(key);
    if (!id) return full;
    if (!symbols.has(id)) {
      symbols.set(id, `<symbol id="${id}"${viewBox ? ` viewBox="${viewBox}"` : ''}>${body}</symbol>`);
    }
    return `<svg${attrs}><use href="#${id}"/></svg>`;
  });

  const sprite =
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" focusable="false" ' +
    'style="position:absolute;width:0;height:0;overflow:hidden">' +
    [...symbols.values()].join('') +
    '</svg>';

  const final = out.replace('</body>', `${sprite}</body>`);
  fs.writeFileSync(file, final);
  return { before: Buffer.byteLength(html), after: Buffer.byteLength(final), symbols: symbols.size };
}

let pages = 0;
let saved = 0;
for (const file of walk(DIST)) {
  const r = processFile(file);
  if (!r) continue;
  pages++;
  saved += r.before - r.after;
}
console.log(`[svg-sprite] ${pages} pagina's gededupliceerd, ${(saved / 1024).toFixed(1)} KB ruw bespaard (${(saved / 1024 / Math.max(pages, 1)).toFixed(1)} KB per pagina)`);
