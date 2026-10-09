// Agreement PDF builder (pdf-lib, runs in a Cloudflare Worker: no Node APIs).
// Layout: cover, the rendered documents, signature page + audit trail
// (skipped for concept), footer "pagina X van Y" on every page.
import {
  PDFDocument, StandardFonts, rgb, degrees,
} from 'pdf-lib';
import { parseBlocks } from './markdown-lite.js';
import { computeEvidenceSha256, formatAmsterdam } from './overeenkomst-core.js';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.4, 0.4, 0.45);
const GRID = rgb(0.78, 0.78, 0.82);
const HEAD_FILL = rgb(0.93, 0.93, 0.95);

const EXTRA_WINANSI = new Set(['€', '‘', '’', '“', '”', '–', '—', '…', '•', '‚', '„', '†', '‡', '‰', '‹', '›', '™', 'Œ', 'œ', 'Š', 'š', 'Ž', 'ž', 'Ÿ', 'ƒ', 'ˆ', '˜']);

const LETTER_MAP = {
  'ı': 'i', 'İ': 'I', 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'ø': 'o', 'Ø': 'O',
  'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G', 'ț': 't', 'Ț': 'T', 'ș': 's', 'Ș': 'S',
  'ħ': 'h', 'Ħ': 'H', 'ŧ': 't', 'Ŧ': 'T', 'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'Th',
};

// Sanitize to what Helvetica/WinAnsi can encode. Never throws.
export function toWinAnsi(input) {
  const str = String(input ?? '').normalize('NFC');
  let out = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d || cp === 0xa0) { out += ' '; continue; }
    if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa1 && cp <= 0xff) || EXTRA_WINANSI.has(ch)) {
      if (cp === 0xad) continue; // soft hyphen
      out += ch;
      continue;
    }
    if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) continue; // control chars
    if (ch === '→') { out += '->'; continue; }
    if (ch === '←') { out += '<-'; continue; }
    if (ch === '≥') { out += '>='; continue; }
    if (ch === '≤') { out += '<='; continue; }
    if (ch === '≠') { out += '!='; continue; }
    if (ch === '×') { out += 'x'; continue; }
    if (ch === '‐' || ch === '‑' || ch === '‒' || ch === '−') { out += '-'; continue; }
    if (ch === ' ' || ch === ' ' || ch === ' ' || ch === ' ') { out += ' '; continue; }
    // zero-width, joiners, variation selectors, BOM, emoji and pictographs
    if ((cp >= 0x200b && cp <= 0x200f) || cp === 0x2060 || cp === 0xfeff
      || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x2190 && cp <= 0x2bff)
      || (cp >= 0x1f000 && cp <= 0x1faff) || (cp >= 0xe0000 && cp <= 0xe007f)
      || (cp >= 0x300 && cp <= 0x36f)) continue;
    // letters that do not NFD-decompose (ı, ł, đ, ø ...): explicit map
    if (Object.hasOwn(LETTER_MAP, ch)) { out += LETTER_MAP[ch]; continue; }
    // letters with diacritics outside Latin-1: strip the mark (ğ -> g)
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (base !== ch && /^[\x20-\x7e]+$/.test(base)) { out += base; continue; }
    out += '-';
  }
  return out;
}

// Inline markdown -> sanitized words with a bold flag.
function inlineWords(text, baseBold) {
  const clean = toWinAnsi(text).replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?![*\w])/g, '$1$2');
  const words = [];
  let bold = false;
  clean.split('**').forEach((seg, idx) => {
    if (idx > 0) bold = !bold;
    for (const w of seg.split(/\s+/)) {
      if (w) words.push({ t: w, bold: bold || baseBold });
    }
  });
  return words;
}

function breakLongWord(word, font, size, maxW) {
  const pieces = [];
  let cur = '';
  for (const ch of word) {
    if (cur && font.widthOfTextAtSize(cur + ch, size) > maxW) { pieces.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) pieces.push(cur);
  return pieces;
}

class PdfWriter {
  constructor(doc, fonts, { concept }) {
    this.doc = doc;
    this.fonts = fonts;
    this.concept = concept;
    this.page = null;
    this.y = 0;
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  ensure(h) {
    if (this.y - h < MARGIN) this.newPage();
  }

  font(bold) { return bold ? this.fonts.bold : this.fonts.regular; }

  // Word-wrap inline text into lines of {t,bold} words.
  wrap(text, size, maxW, baseBold = false) {
    const words = inlineWords(text, baseBold);
    const lines = [];
    let line = [];
    let w = 0;
    const space = this.fonts.regular.widthOfTextAtSize(' ', size);
    const flush = () => { if (line.length) lines.push(line); line = []; w = 0; };
    for (const word of words) {
      const f = this.font(word.bold);
      const parts = f.widthOfTextAtSize(word.t, size) > maxW
        ? breakLongWord(word.t, f, size, maxW) : [word.t];
      for (const part of parts) {
        const pw = f.widthOfTextAtSize(part, size);
        const need = line.length ? w + space + pw : pw;
        if (line.length && need > maxW) flush();
        w = line.length ? w + space + pw : pw;
        line.push({ t: part, bold: word.bold });
      }
    }
    flush();
    return lines;
  }

  drawLine(page, line, x, baseline, size, color) {
    let cx = x;
    const space = this.fonts.regular.widthOfTextAtSize(' ', size);
    for (const word of line) {
      const f = this.font(word.bold);
      page.drawText(word.t, {
        x: cx, y: baseline, size, font: f, color,
      });
      cx += f.widthOfTextAtSize(word.t, size) + space;
    }
  }

  // Paragraph-like text with page breaks. Returns nothing.
  text(text, {
    size = 10, bold = false, indent = 0, color = INK, gapAfter = 6, leading = 1.35, firstPrefix = null,
  } = {}) {
    const x0 = MARGIN + indent;
    const lines = this.wrap(text, size, CONTENT_W - indent, bold);
    const lh = size * leading;
    if (!lines.length) { this.y -= gapAfter; return; }
    lines.forEach((line, idx) => {
      this.ensure(lh);
      this.y -= lh;
      const baseline = this.y + lh * 0.25;
      if (idx === 0 && firstPrefix) {
        this.page.drawText(firstPrefix.text, {
          x: x0 - firstPrefix.width, y: baseline, size, font: this.fonts.regular, color,
        });
      }
      this.drawLine(this.page, line, x0, baseline, size, color);
    });
    this.y -= gapAfter;
  }

  heading(text, size, gapBefore, gapAfter) {
    this.ensure(gapBefore + size * 1.35 + 40);
    this.y -= gapBefore;
    this.text(text, {
      size, bold: true, gapAfter, leading: 1.25,
    });
  }

  list(items, ordered) {
    const size = 10;
    const indent = 16;
    items.forEach((item, idx) => {
      const marker = ordered ? `${idx + 1}.` : '•';
      const mw = this.fonts.regular.widthOfTextAtSize(marker, size);
      this.text(item, {
        size, indent, gapAfter: 3, firstPrefix: { text: marker, width: indent - 2 < mw ? mw : indent - 2 },
      });
    });
    this.y -= 4;
  }

  hr() {
    this.ensure(14);
    this.y -= 7;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.6,
      color: GRID,
    });
    this.y -= 7;
  }

  // Simple grid table. rows[0] is the header. widths = optional fractions.
  table(rows, { size = 8, widths = null } = {}) {
    if (!rows.length) return;
    const cols = Math.max(...rows.map((r) => r.length));
    const fr = widths && widths.length === cols ? widths : Array(cols).fill(1 / cols);
    const sum = fr.reduce((a, b) => a + b, 0);
    const colW = fr.map((f) => (f / sum) * CONTENT_W);
    const pad = 4;
    const lh = size * 1.3;
    const maxLines = Math.floor((PAGE_H - 2 * MARGIN - 2 * pad) / lh);
    rows.forEach((row, ri) => {
      const cells = Array.from({ length: cols }, (_, ci) => {
        const lines = this.wrap(row[ci] ?? '', size, colW[ci] - 2 * pad, ri === 0);
        return lines.slice(0, maxLines);
      });
      const nLines = Math.max(1, ...cells.map((c) => c.length));
      const rowH = nLines * lh + 2 * pad;
      if (this.y - rowH < MARGIN) this.newPage();
      const top = this.y;
      if (ri === 0) {
        this.page.drawRectangle({
          x: MARGIN, y: top - rowH, width: CONTENT_W, height: rowH, color: HEAD_FILL,
        });
      }
      let cx = MARGIN;
      cells.forEach((lines, ci) => {
        this.page.drawRectangle({
          x: cx, y: top - rowH, width: colW[ci], height: rowH, borderColor: GRID, borderWidth: 0.5,
        });
        lines.forEach((line, li) => {
          const baseline = top - pad - (li + 1) * lh + lh * 0.3;
          this.drawLine(this.page, line, cx + pad, baseline, size, INK);
        });
        cx += colW[ci];
      });
      this.y = top - rowH;
    });
    this.y -= 8;
  }

  blocks(markdown) {
    for (const b of parseBlocks(markdown)) {
      switch (b.type) {
        case 'h':
          if (b.level === 1) this.heading(b.text, 18, 6, 8);
          else if (b.level === 2) this.heading(b.text, 14, 10, 6);
          else this.heading(b.text, 12, 8, 4);
          break;
        case 'p': this.text(b.text); break;
        case 'ul': this.list(b.items, false); break;
        case 'ol': this.list(b.items, true); break;
        case 'hr': this.hr(); break;
        case 'quote': this.text(b.text, { indent: 14, color: MUTED }); break;
        case 'table': this.table(b.rows); break;
        default: break;
      }
    }
  }
}

function fitImage(img, maxW, maxH) {
  const s = Math.min(maxW / img.width, maxH / img.height, 1);
  return { width: img.width * s, height: img.height * s };
}

async function tryEmbedPng(doc, bytes) {
  if (!bytes || !bytes.length) return null;
  try { return await doc.embedPng(bytes); } catch { return null; }
}

// Customer signature: a broken PNG must fail the sign request, never fall back to typed text.
async function embedCustomerPng(doc, bytes) {
  if (!bytes || !bytes.length) return null;
  return doc.embedPng(bytes);
}

function cover(w, { agreement, customer, documents, concept }) {
  const bedrijf = customer?.bedrijf || '';
  w.y = PAGE_H - 200;
  w.text('AanloopAI', { size: 12, color: MUTED, gapAfter: 18 });
  w.text(`Overeenkomst AanloopAI × ${bedrijf}`, {
    size: 26, bold: true, leading: 1.2, gapAfter: 18,
  });
  const when = agreement?.signed_at && !concept ? agreement.signed_at : Date.now();
  w.text(`Datum: ${formatAmsterdam(when).split(' ')[0]}`, { size: 11, gapAfter: 4 });
  w.text(`Referentie: ${agreement?.id ?? ''}`, { size: 11, gapAfter: 4 });
  if (agreement?.title) w.text(agreement.title, { size: 11, gapAfter: 4 });
  w.y -= 24;
  w.text('Inhoud', { size: 12, bold: true, gapAfter: 8 });
  documents.forEach((d, i) => {
    w.text(`${i + 1}. ${d.title} (versie ${d.template_version})`, { size: 10, gapAfter: 3 });
  });
  w.y -= 8;
  w.text(`Opdrachtnemer: AanloopAI · KvK 88606902 · Blokfluit 31, 3068 KZ Rotterdam`, { size: 9, color: MUTED, gapAfter: 3 });
  if (concept) {
    w.text('Dit is een conceptversie. Het document is nog niet ondertekend.', { size: 9, color: MUTED });
  }
}

async function signaturePage(w, {
  agreement, customer, signature, consents, otpVerifiedAt, aanloopSignaturePngBytes, documents,
}) {
  const { doc } = w;
  w.newPage();
  w.heading('Ondertekening', 18, 0, 10);
  const signedAt = signature?.signed_at ?? agreement?.signed_at ?? Date.now();

  // Opdrachtgever
  w.text('Opdrachtgever', { size: 12, bold: true, gapAfter: 4 });
  w.text(`Bedrijf: ${customer?.bedrijf || ''}`, { gapAfter: 2 });
  w.text(`Getypte naam: ${signature?.typed_name || ''}`, { gapAfter: 2 });
  w.text(`Ondertekend op: ${formatAmsterdam(signedAt)} (Europe/Amsterdam)`, { gapAfter: 2 });
  w.text(`IP-adres: ${signature?.ip || 'onbekend'}`, { gapAfter: 2 });
  w.text(`Apparaat: ${String(signature?.user_agent || 'onbekend').slice(0, 160)}`, { gapAfter: 8, size: 8, color: MUTED });
  const img = await embedCustomerPng(doc, signature?.pngBytes);
  if (img) {
    const { width, height } = fitImage(img, 220, 90);
    w.ensure(height + 12);
    w.page.drawImage(img, {
      x: MARGIN, y: w.y - height, width, height,
    });
    w.page.drawLine({
      start: { x: MARGIN, y: w.y - height - 3 }, end: { x: MARGIN + 240, y: w.y - height - 3 }, thickness: 0.5, color: GRID,
    });
    w.y -= height + 14;
  } else {
    w.text(toWinAnsi(signature?.typed_name || ''), { size: 16, bold: true, gapAfter: 10 });
  }

  // Opdrachtnemer
  w.y -= 8;
  w.ensure(150);
  w.text('Opdrachtnemer', { size: 12, bold: true, gapAfter: 4 });
  w.text('AanloopAI (Mustafa Dogan)', { gapAfter: 2 });
  w.text(`Datum: ${formatAmsterdam(signedAt).split(' ')[0]}`, { gapAfter: 8 });
  const aimg = await tryEmbedPng(doc, aanloopSignaturePngBytes);
  if (aimg) {
    const { width, height } = fitImage(aimg, 200, 90);
    w.ensure(height + 12);
    w.page.drawImage(aimg, {
      x: MARGIN, y: w.y - height, width, height,
    });
    w.page.drawLine({
      start: { x: MARGIN, y: w.y - height - 3 }, end: { x: MARGIN + 240, y: w.y - height - 3 }, thickness: 0.5, color: GRID,
    });
    w.y -= height + 14;
  } else {
    w.text('Mustafa Dogan (AanloopAI)', { size: 16, bold: true, gapAfter: 10 });
  }

  // Audit trail
  w.y -= 8;
  w.heading('Controlelogboek (audit trail)', 14, 6, 6);
  const rows = [['Document', 'Versie', 'SHA-256', 'Scroll tot einde', 'Leestijd (s)', 'Akkoord']];
  for (const c of consents || []) {
    rows.push([
      c.document_title ?? '',
      c.template_version ?? '',
      c.content_sha256 ?? '',
      c.scrolled_to_end_at ? formatAmsterdam(c.scrolled_to_end_at) : '',
      String(c.time_on_document_sec ?? ''),
      c.checkbox_at ? formatAmsterdam(c.checkbox_at) : '',
    ]);
  }
  w.table(rows, { size: 7, widths: [2.2, 0.9, 3.6, 1.7, 1, 1.7] });
  w.text(`E-mailverificatie (eenmalige code) bevestigd: ${otpVerifiedAt ? formatAmsterdam(otpVerifiedAt) : 'onbekend'}`, { size: 9, gapAfter: 3 });
  const evidence = agreement?.evidence_sha256 || await computeEvidenceSha256({
    agreementId: agreement?.id ?? null,
    userId: null,
    contentHashes: documents.map((d) => d.content_sha256),
    typedName: signature?.typed_name ?? '',
    signedAtMs: signedAt,
    signatureSha256: null,
    otpVerifiedAt: otpVerifiedAt ?? null,
    consentCheckboxAts: consents.map((c) => c.checkbox_at ?? null),
  });
  w.text(`Bewijs-hash (SHA-256): ${evidence}`, { size: 8, gapAfter: 3 });
  w.text('Digitale handtekening conform eIDAS en art. 3:15a BW.', { size: 8, color: MUTED });
}

function decoratePages(doc, fonts, { agreementId, concept }) {
  const pages = doc.getPages();
  const total = pages.length;
  const footerFont = fonts.regular;
  const wmText = toWinAnsi('CONCEPT - NIET ONDERTEKEND');
  pages.forEach((page, idx) => {
    const footer = toWinAnsi(`AanloopAI · KvK 88606902 · ${agreementId} · pagina ${idx + 1} van ${total}`);
    const fw = footerFont.widthOfTextAtSize(footer, 8);
    page.drawText(footer, {
      x: (PAGE_W - fw) / 2, y: 28, size: 8, font: footerFont, color: MUTED,
    });
    if (concept) {
      const size = 44;
      const tw = fonts.bold.widthOfTextAtSize(wmText, size);
      const rad = Math.PI / 4;
      page.drawText(wmText, {
        x: PAGE_W / 2 - (tw / 2) * Math.cos(rad) + (size / 3) * Math.sin(rad),
        y: PAGE_H / 2 - (tw / 2) * Math.sin(rad) - (size / 3) * Math.cos(rad),
        size,
        font: fonts.bold,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.15,
        rotate: degrees(45),
      });
    }
  });
}

export async function buildAgreementPdf({
  agreement, customer, documents, signature, consents, otpVerifiedAt, aanloopSignaturePngBytes, concept,
}) {
  const docs = documents || [];
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(`Overeenkomst AanloopAI - ${customer?.bedrijf || ''}`));
  doc.setAuthor('AanloopAI');
  doc.setProducer('AanloopAI portaal');
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const w = new PdfWriter(doc, fonts, { concept: !!concept });

  cover(w, {
    agreement, customer, documents: docs, concept,
  });
  for (const d of docs) {
    w.newPage();
    w.blocks(d.rendered_markdown);
  }
  if (!concept) {
    await signaturePage(w, {
      agreement, customer, signature, consents, otpVerifiedAt, aanloopSignaturePngBytes, documents: docs,
    });
  }
  decoratePages(doc, fonts, { agreementId: agreement?.id ?? '', concept: !!concept });
  return doc.save();
}
