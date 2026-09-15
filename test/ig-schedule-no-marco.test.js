// 2026-09-15: Marco is hernoemd naar Emma (merkbesluit). Het SERP-onderzoek van
// vandaag vond nog recente Instagram-posts met "Marco — AI-telefoniste" naast een
// site die "Emma" zegt. In de wachtrij stonden 6 ongepubliceerde Marco-reels;
// zodra de reels-pipeline (issue #57) weer werkt, zouden die gewoon live gaan.
//
// Dit guard-bestand doet twee dingen:
//  1. geen enkele nog-te-publiceren schedule-entry mag "Marco" bevatten zonder
//     een skip_reason;
//  2. de publish-scripts moeten skip_reason ook echt respecteren.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('marketing/instagram');

function schedules() {
  return fs.readdirSync(DIR)
    .filter((f) => /^wave-\d+(-week\d+)?(-reels|-stories)?-schedule\.json$/.test(f))
    .map((f) => ({ file: f, sched: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));
}

describe('Instagram-wachtrij: geen Marco meer', () => {
  it('elke ongepubliceerde entry die Marco noemt heeft een skip_reason', () => {
    const offenders = [];
    for (const { file, sched } of schedules()) {
      for (const p of sched.posts || []) {
        if (p.posted_at !== null) continue;
        if (p.skip_reason) continue;
        if (JSON.stringify(p).toLowerCase().includes('marco')) offenders.push(`${file}: ${p.id || p.slot_iso}`);
      }
    }
    expect(offenders, 'ongepubliceerde Marco-content zonder skip_reason').toEqual([]);
  });

  it('er staan ook nog Emma-reels in de wachtrij (skip trof niet alles)', () => {
    const pending = schedules().flatMap(({ sched }) =>
      (sched.posts || []).filter((p) => p.posted_at === null && !p.skip_reason));
    expect(pending.length).toBeGreaterThan(0);
  });

  it('de drie publish-scripts en de renderer filteren op skip_reason', () => {
    for (const f of ['scripts/ig-publish.mjs', 'scripts/ig-publish-reel.mjs', 'scripts/ig-publish-story.mjs']) {
      const src = fs.readFileSync(f, 'utf8');
      expect(src, f).toContain('!p.skip_reason && new Date(p.slot_iso)');
      expect(src, f).not.toMatch(/p\.posted_at === null\)/);
    }
    const py = fs.readFileSync('scripts/render-ig-reel.py', 'utf8');
    expect(py).toContain('not s.get("skip_reason")');
  });
});
