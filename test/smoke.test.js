import { describe, it, expect } from 'vitest';
import { EMMA, GROEI } from '../src/data/pricing.ts';

describe('testharnas', () => {
  it('kan de prijsbron importeren', () => {
    expect(EMMA.monthlyCent).toBe(49700);
    expect(EMMA.setup).toBe(495);
    expect(GROEI.monthlyCent).toBe(99700);
    expect(GROEI.setup).toBe(795);
  });
});
