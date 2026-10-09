import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildAgreementPdf, toWinAnsi } from '../src/lib/agreement-pdf.js';
import { renderTemplate, sha256Hex } from '../src/lib/overeenkomst-core.js';

const PNG_1X1 = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
));

const VARS = {
  klant_bedrijfsnaam: 'Foralle Naarden BV', klant_rechtsvorm: 'BV', klant_kvk: '12345678', klant_btw: 'NL123456789B01',
  klant_adres: 'Lambertus Hortensiuslaan 16', klant_postcode: '1412 GW', klant_plaats: 'Naarden',
  klant_contact_naam: 'Ron Houter', project_naam: 'Website', project_domein: 'x.nl', agreement_id: 'agr_test',
};

async function realDocs() {
  const defs = [
    ['overeenkomst', 'Overeenkomst van opdracht'],
    ['algemene-voorwaarden', 'Algemene Voorwaarden AanloopAI'],
    ['privacy-verwerker', 'Privacyverklaring en Verwerkersovereenkomst'],
  ];
  return Promise.all(defs.map(async ([slug, title]) => {
    const md = renderTemplate(readFileSync(`content/legal/${slug}.md`, 'utf8'), VARS);
    return { title, template_version: '1.0', rendered_markdown: md, content_sha256: await sha256Hex(md) };
  }));
}

const customer = { bedrijf: 'Foralle Naarden BV', kvk: '12345678' };
const agreement = { id: 'agr_test', title: 'Overeenkomst', signed_at: Date.UTC(2026, 9, 9, 10, 0) };

describe('toWinAnsi', () => {
  it('keeps Latin-1 and typographic chars, maps arrows, drops emoji', () => {
    expect(toWinAnsi('café € “q” – — …')).toBe('café € “q” – — …');
    expect(toWinAnsi('a → b ≥ c ≤ d')).toBe('a -> b >= c <= d');
    expect(toWinAnsi('hi 😀 there')).toBe('hi  there');
    expect(toWinAnsi('ğ日')).toBe('g-');
    expect(toWinAnsi('Yılmaz')).toBe('Yilmaz');
    expect(toWinAnsi('Łukasz')).toBe('Lukasz');
    expect(toWinAnsi('İŞĞ ışğ đøȚ')).toBe('ISG isg døT');
    expect(toWinAnsi('a\tb\nc')).toBe('a b c');
  });
});

describe('buildAgreementPdf', () => {
  it('builds a signed PDF from the three real legal documents', async () => {
    const documents = await realDocs();
    const bytes = await buildAgreementPdf({
      agreement, customer, documents,
      signature: { typed_name: 'Ron Houter', pngBytes: PNG_1X1, signed_at: agreement.signed_at, ip: '1.2.3.4', user_agent: 'Mozilla/5.0 test' },
      consents: documents.map((d, i) => ({
        document_title: d.title, template_version: '1.0', content_sha256: d.content_sha256,
        scrolled_to_end_at: agreement.signed_at - 60000, time_on_document_sec: 90 + i, checkbox_at: agreement.signed_at - 30000,
      })),
      otpVerifiedAt: agreement.signed_at - 5000,
      aanloopSignaturePngBytes: PNG_1X1,
      concept: false,
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(10);
  });

  it('builds a concept PDF without signature data', async () => {
    const documents = await realDocs();
    const bytes = await buildAgreementPdf({
      agreement: { id: 'agr_test', title: 'x' }, customer, documents, signature: null, consents: [], otpVerifiedAt: null,
      aanloopSignaturePngBytes: null, concept: true,
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF');
    const full = await buildAgreementPdf({
      agreement, customer, documents,
      signature: { typed_name: 'R', pngBytes: null, signed_at: 1, ip: null, user_agent: null },
      consents: [], otpVerifiedAt: null, aanloopSignaturePngBytes: null, concept: false,
    });
    expect((await PDFDocument.load(full)).getPageCount()).toBeGreaterThan((await PDFDocument.load(bytes)).getPageCount());
  });

  it('survives non-WinAnsi text, huge words, bad PNG bytes and missing optional data', async () => {
    const md = `# Titel 😀 → ≥\n\n${'x'.repeat(400)}\n\n| a | ${'y'.repeat(300)} |\n|---|---|\n| 日本 | ğüş |\n\n- punt ✓\n\n1. nummer\n\n> citaat\n\n---\n\n*Einde*`;
    const bytes = await buildAgreementPdf({
      agreement: { id: 'agr_x' }, customer: null,
      documents: [{ title: 'Doc 😀', template_version: '1.0', rendered_markdown: md, content_sha256: 'abc' }],
      signature: { typed_name: 'Zoë 日本', pngBytes: null, signed_at: 1 },
      consents: [{ document_title: 'Doc', content_sha256: 'abc' }],
      otpVerifiedAt: 1, aanloopSignaturePngBytes: Uint8Array.from([9]), concept: false,
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF');
  });

  it('throws on a broken customer signature PNG (no silent typed-text fallback)', async () => {
    await expect(buildAgreementPdf({
      agreement: { id: 'agr_x' }, customer: null,
      documents: [{ title: 'Doc', template_version: '1.0', rendered_markdown: 'tekst', content_sha256: 'abc' }],
      signature: { typed_name: 'Jan Jansen', pngBytes: Uint8Array.from([1, 2, 3]), signed_at: 1 },
      consents: [], otpVerifiedAt: 1, aanloopSignaturePngBytes: null, concept: false,
    })).rejects.toThrow();
  });
});
