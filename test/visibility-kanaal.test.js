// Kanaal-classificatie (AI / zoek / sociaal / gbp / direct) — port van keukeninbeeld ai-hosts.test.mjs.
import { describe, it, expect } from 'vitest';
import { bepaalKanaal, hostMatch, AI_HOSTS, summarizeHits } from '../src/lib/visibility-core.js';

describe('bepaalKanaal', () => {
  it('telt alle bekende assistenten als ai met een bron', () => {
    const hosts = [
      'chatgpt.com', 'www.chatgpt.com', 'www.perplexity.ai', 'gemini.google.com',
      'copilot.microsoft.com', 'copilot.cloud.microsoft', 'm365.cloud.microsoft',
      'edgeservices.bing.com', 'claude.ai', 'meta.ai', 'www.meta.ai', 'duck.ai',
      'chat.deepseek.com', 'kagi.com', 'chat.mistral.ai', 'chat.qwen.ai', 'grok.com',
      'notebooklm.google.com', 'aistudio.google.com',
    ];
    for (const h of hosts) {
      const r = bepaalKanaal('', h);
      expect(r.kanaal, h).toBe('ai');
      expect(r.aiBron, h).toBeTruthy();
    }
  });

  it('houdt zoekmachines buiten ai', () => {
    expect(bepaalKanaal('', 'www.google.nl').kanaal).toBe('zoek');
    expect(bepaalKanaal('', 'www.bing.com').kanaal).toBe('zoek');
    expect(bepaalKanaal('', 'duckduckgo.com').kanaal).toBe('zoek');
  });

  it('matcht op labelgrens, niet op substring', () => {
    expect(bepaalKanaal('', 'box.ai').kanaal).toBe('verwijzing');
    expect(bepaalKanaal('', 'metamask.io').kanaal).toBe('verwijzing');
    expect(bepaalKanaal('', 'someduck.ai').kanaal).toBe('verwijzing');
    expect(bepaalKanaal('', 'bouwmaat.com').kanaal).toBe('verwijzing');
    expect(hostMatch('mygoogle.com', 'google.')).toBe(false);
    expect(hostMatch('google', 'google.')).toBe(false);
    expect(hostMatch('www.google.nl', 'google.')).toBe(true);
    expect(hostMatch('x.ai', ['bing.com', 'x.ai'])).toBe(true);
  });

  it('classificeert direct, sociaal, gbp en utm-voorrang', () => {
    expect(bepaalKanaal('', '')).toEqual({ kanaal: 'direct', aiBron: null });
    expect(bepaalKanaal(undefined, undefined).kanaal).toBe('direct');
    expect(bepaalKanaal('', 'l.facebook.com').kanaal).toBe('sociaal');
    expect(bepaalKanaal('gbp', 'www.google.com').kanaal).toBe('gbp');
    expect(bepaalKanaal('google-bedrijfsprofiel', '').kanaal).toBe('gbp');
    expect(bepaalKanaal('bing-places', 'www.bing.com').kanaal).toBe('gbp');
    expect(bepaalKanaal('chatgpt.com', '')).toEqual({ kanaal: 'ai', aiBron: 'chatgpt.com' });
    expect(bepaalKanaal('chatgpt.com', 'www.google.nl').kanaal).toBe('ai');
    expect(bepaalKanaal('nieuwsbrief', '').kanaal).toBe('verwijzing');
  });

  it('exporteert de volledige 27-host lijst', () => {
    expect(AI_HOSTS).toHaveLength(27);
  });
});

describe('summarizeHits kanalen', () => {
  const rows = [
    { sid: 'a1a1a1a1', seq: 1, t: 'view', path: '/', src: 'chatgpt.com' },
    { sid: 'a1a1a1a1', seq: 2, t: 'tel', path: '/' },
    { sid: 'b2b2b2b2', seq: 1, t: 'view', path: '/diensten/', ref: 'perplexity.ai' },
    { sid: 'c3c3c3c3', seq: 1, t: 'view', path: '/diensten/', ref: 'www.perplexity.ai' },
    { sid: 'd4d4d4d4', seq: 1, t: 'view', path: '/blog/', ref: 'www.google.nl' },
    { sid: 'e5e5e5e5', seq: 1, t: 'view', path: '/', ref: 'www.google.nl' },
    { sid: 'e5e5e5e5', seq: 2, t: 'form', path: '/' },
    { sid: 'f6f6f6f6', seq: 1, t: 'view', path: '/' },
  ];

  it('geeft kanalen, aiLanding en aiBronnen terug, gesorteerd op sessies', () => {
    const s = summarizeHits(rows);
    expect(s.kanalen).toEqual([
      { kanaal: 'ai', sessions: 3, conv: 1, convRate: 33.3 },
      { kanaal: 'zoek', sessions: 2, conv: 1, convRate: 50 },
      { kanaal: 'direct', sessions: 1, conv: 0, convRate: 0 },
    ]);
    expect(s.aiLanding).toEqual([
      { path: '/diensten/', sessions: 2, conv: 0 },
      { path: '/', sessions: 1, conv: 1 },
    ]);
    // perplexity.ai en www.perplexity.ai vallen onder dezelfde AI_HOSTS-ingang; eerste match wint
    expect(s.aiBronnen).toEqual([
      { bron: 'perplexity.ai', sessions: 2, conv: 0 },
      { bron: 'chatgpt.com', sessions: 1, conv: 1 },
    ]);
  });

  it('laat bestaande sleutels ongemoeid', () => {
    const s = summarizeHits(rows);
    expect(s.sessions).toBe(6);
    expect(s.conversionRate).toBe(33.3);
    expect(s.sources.find((r) => r.bron === 'chatgpt.com')).toEqual({ bron: 'chatgpt.com', sessions: 1, conv: 100 });
    expect(s.landing.find((l) => l.path === '/')).toEqual({ path: '/', sessions: 3, bounce: 100, conv: 66.7 });
  });

  it('geeft lege lijsten zonder rijen', () => {
    const s = summarizeHits([]);
    expect(s.kanalen).toEqual([]);
    expect(s.aiLanding).toEqual([]);
    expect(s.aiBronnen).toEqual([]);
  });
});
