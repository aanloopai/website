// Minimal markdown subset used by content/legal/*.md. Shared by the HTML
// renderer (portal/admin) and the PDF builder, so both see identical blocks.
import { escapeHtml } from './escape.js';

const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

const isTableLine = (l) => /^\s*\|.*\|\s*$/.test(l);
const isHr = (l) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
const isUl = (l) => /^\s*[-*]\s+/.test(l) && !isHr(l);
const isOl = (l) => /^\s*\d+[.)]\s+/.test(l);
const isHeading = (l) => /^\s*#{1,6}\s+/.test(l);
const isQuote = (l) => /^\s*>/.test(l);

export function parseBlocks(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    const h = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) { blocks.push({ type: 'h', level: h[1].length, text: h[2] }); i += 1; continue; }

    if (isHr(line)) { blocks.push({ type: 'hr' }); i += 1; continue; }

    if (isTableLine(line)) {
      const rows = [];
      while (i < lines.length && isTableLine(lines[i])) {
        if (!TABLE_SEP.test(lines[i])) rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }

    if (isQuote(line)) {
      const parts = [];
      while (i < lines.length && isQuote(lines[i])) {
        parts.push(lines[i].replace(/^\s*>\s?/, '').trim());
        i += 1;
      }
      blocks.push({ type: 'quote', text: parts.join(' ').trim() });
      continue;
    }

    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line);
      const test = ordered ? isOl : isUl;
      const strip = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/;
      const items = [];
      while (i < lines.length && test(lines[i])) {
        items.push(lines[i].replace(strip, '').trim());
        i += 1;
        // indented non-list lines continue the previous item
        while (i < lines.length && lines[i].trim() && /^\s+\S/.test(lines[i]) && !isUl(lines[i]) && !isOl(lines[i])) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i += 1;
        }
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items });
      continue;
    }

    // paragraph: consecutive non-blank lines that don't start another block
    const parts = [];
    while (
      i < lines.length && lines[i].trim()
      && !isHeading(lines[i]) && !isHr(lines[i]) && !isTableLine(lines[i])
      && !isQuote(lines[i]) && !isUl(lines[i]) && !isOl(lines[i])
    ) {
      parts.push(lines[i].trim());
      i += 1;
    }
    if (!parts.length) { i += 1; continue; }
    blocks.push({ type: 'p', text: parts.join(' ') });
  }
  return blocks;
}

// Inline: escape first, then **bold** / *italic*.
function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?![*\w])/g, '$1<em>$2</em>');
}

export function renderHtml(md) {
  const out = [];
  for (const b of parseBlocks(md)) {
    switch (b.type) {
      case 'h': out.push(`<h${b.level}>${inline(b.text)}</h${b.level}>`); break;
      case 'p': out.push(`<p>${inline(b.text)}</p>`); break;
      case 'ul': out.push(`<ul>${b.items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`); break;
      case 'ol': out.push(`<ol>${b.items.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`); break;
      case 'hr': out.push('<hr>'); break;
      case 'quote': out.push(`<blockquote>${inline(b.text)}</blockquote>`); break;
      case 'table': {
        const [head, ...body] = b.rows;
        const th = (head || []).map((c) => `<th>${inline(c)}</th>`).join('');
        const trs = body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
        out.push(`<table class="md-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
        break;
      }
      default: break;
    }
  }
  return out.join('\n');
}

export function wordCount(md) {
  const t = String(md ?? '').trim();
  return t ? t.split(/\s+/).length : 0;
}
