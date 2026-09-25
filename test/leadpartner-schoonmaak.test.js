// Leadpartner-intake voor schoonmaakbedrijven (2026-09-25): verborgen
// portaalproduct `leadpartner-schoonmaak`. Het uitzend-schema (`leadpartner`)
// vraagt verplicht naar Wtta, SNA, functies en huisvesting — onbruikbaar voor
// een schoonmaakbedrijf (aanleiding: aanmelding Optima Facility Services).
import { describe, it, expect } from 'vitest';
import { INTAKE_SCHEMAS, getIntakeSchema } from '../src/data/intake-schemas.ts';
import { getCatalogProduct, getCatalogTier } from '../src/data/portal-catalog.ts';
import { formatOrderSubmitTelegram } from '../src/lib/portal-routes.js';

const KNOWN_TYPES = ['text', 'textarea', 'tel', 'email', 'url', 'select', 'multiselect', 'faqlist', 'consent', 'info'];
const schema = INTAKE_SCHEMAS['leadpartner-schoonmaak'];
const allFields = () => schema.steps.flatMap((s) => s.fields);

describe('leadpartner-schoonmaak schema', () => {
  it('bestaat, is de bron voor getIntakeSchema en heeft 10 stappen', () => {
    expect(getIntakeSchema('leadpartner-schoonmaak')).toBe(schema);
    expect(schema.steps.map((s) => s.key)).toEqual([
      'bedrijf', 'kwaliteit', 'dienstverlening', 'opdrachtgever', 'werkgebied',
      'leadkwaliteit', 'levering', 'volume', 'huidig', 'afronding',
    ]);
  });

  it('bevat geen uitzend-specifieke vragen', () => {
    const names = allFields().map((f) => f.name);
    for (const n of ['kvk_uitlenen', 'sna', 'wtta', 'vormen', 'functies', 'certificaten', 'huisvesting', 'flexkrachten', 'min_personen', 'diensten_ploegen', 'vervoer_kandidaten']) {
      expect(names).not.toContain(n);
    }
    expect(JSON.stringify(schema)).not.toMatch(/Wtta|uitzend|flexkracht|orderpicker|heftruck/i);
  });

  it('vraagt verplicht naar type pand, oppervlakte en frequentie', () => {
    const opdrachtgever = schema.steps.find((s) => s.key === 'opdrachtgever').fields;
    for (const n of ['sectoren', 'oppervlakte', 'frequentie', 'type_opdracht', 'min_opdracht']) {
      expect(opdrachtgever.find((f) => f.name === n)?.required, n).toBe(true);
    }
    expect(opdrachtgever.find((f) => f.name === 'sectoren').options).toContain('Kantoren');
  });

  it('gebruikt alleen bekende veldtypes, unieke namen per stap, en label of info-tekst', () => {
    for (const step of schema.steps) {
      const names = step.fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
      for (const f of step.fields) {
        expect(KNOWN_TYPES).toContain(f.type);
        if (f.type === 'info') expect(f.text).toBeTruthy();
        else expect(f.label).toBeTruthy();
        if (f.type === 'select' || f.type === 'multiselect') expect(f.options?.length).toBeGreaterThan(1);
      }
    }
  });

  it('showIf verwijst naar een select/multiselect in dezelfde stap met bestaande opties', () => {
    let count = 0;
    for (const step of schema.steps) {
      for (const f of step.fields) {
        if (!f.showIf) continue;
        count++;
        const src = step.fields.find((g) => g.name === f.showIf.field);
        expect(src, `${step.key}.${f.name} → ${f.showIf.field}`).toBeTruthy();
        expect(['select', 'multiselect']).toContain(src.type);
        for (const v of f.showIf.in) expect(src.options).toContain(v);
        expect(f.required).toBeFalsy();
      }
    }
    expect(count).toBe(5);
  });

  it('deelt volume en afronding (consent) met het uitzend-schema', () => {
    const lp = INTAKE_SCHEMAS.leadpartner;
    for (const key of ['volume', 'afronding']) {
      expect(schema.steps.find((s) => s.key === key)).toBe(lp.steps.find((s) => s.key === key));
    }
  });

  it('bevat nergens een bedrag als prijsbelofte', () => {
    const budgetField = schema.steps.find((s) => s.key === 'volume').fields.find((f) => f.name === 'budget_lead');
    expect(JSON.stringify(schema).replace(JSON.stringify(budgetField), '')).not.toMatch(/€\s?\d/);
  });
});

describe('leadpartner-schoonmaak in de catalogus', () => {
  it('is verborgen, heeft één tier "Exclusief" op aanvraag zonder bedrag', () => {
    const p = getCatalogProduct('leadpartner-schoonmaak');
    expect(p.verborgen).toBe(true);
    expect(p.tiers.map((t) => t.naam)).toEqual(['Exclusief']);
    const t = getCatalogTier('leadpartner-schoonmaak', 'Exclusief');
    expect(t.betaling).toBe('aanvraag');
    expect(t.prijsCent).toBeNull();
  });
});

describe('Telegram-samenvatting voor leadpartner-schoonmaak', () => {
  it('toont type pand, werkgebied en volume; nooit contactgegevens', () => {
    const text = formatOrderSubmitTelegram({
      bedrijf: 'Schoon BV', productKey: 'leadpartner-schoonmaak', tier: 'Exclusief', orderId: 'ord_9',
      intake: {
        opdrachtgever: { sectoren: ['Kantoren', 'Onderwijs'] },
        werkgebied: { basis: 'Almere', straal: 'Tot 25 km' },
        volume: { volume_maand: 'Tot 5' },
        levering: { lead_email: 'leads@example.com' },
      },
    });
    expect(text).toContain('Branche: Kantoren, Onderwijs');
    expect(text).toContain('Werkgebied: Almere · Tot 25 km');
    expect(text).toContain('Volume: Tot 5/maand');
    expect(text).not.toContain('@example.com');
  });
});
