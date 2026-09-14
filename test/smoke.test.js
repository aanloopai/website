import { describe, it, expect } from 'vitest';
import { START, GROEI, COMPLEET, EMMA } from '../src/data/pricing.ts';

describe('testharnas', () => {
  it('kan de prijsbron importeren', () => {
    expect(START.monthlyCent).toBe(14900);
    expect(START.setup).toBe(0);
    expect(GROEI.monthlyCent).toBe(29900);
    expect(GROEI.setup).toBe(495);
    expect(COMPLEET.monthlyCent).toBe(49700);
    expect(COMPLEET.setup).toBe(795);
    expect(EMMA).toBe(COMPLEET); // legacy alias
  });
});
