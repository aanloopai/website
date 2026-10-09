import { describe, it, expect } from 'vitest';
import { attachmentDisposition } from '../src/lib/aanlever-routes.js';

describe('attachmentDisposition', () => {
  it('is a valid ByteString header for non-Latin-1 names (workerd would throw otherwise)', () => {
    const v = attachmentDisposition('Логотип 日本 “x”.png');
    expect([...v].every((c) => c.charCodeAt(0) <= 0xff)).toBe(true);
    expect(() => new Headers({ 'Content-Disposition': v })).not.toThrow();
    expect(v).toContain("filename*=UTF-8''");
    expect(v).toContain(encodeURIComponent('日本'));
  });
  it('strips quotes and path parts', () => {
    expect(attachmentDisposition('..\\evil"name.pdf')).toBe('attachment; filename="evilname.pdf"; filename*=UTF-8\'\'evilname.pdf');
  });
});
