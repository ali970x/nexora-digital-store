import {describe, expect, it} from 'vitest';

import {formatMinorUnits} from './money';

describe('formatMinorUnits', () => {
  it('formats two-decimal currencies from integer minor units', () => {
    expect(formatMinorUnits(12_345, 'USD', 'en')).toBe('$123.45');
  });

  it('keeps LBP in zero-decimal minor units', () => {
    const formatted = formatMinorUnits(12_450_000, 'LBP', 'en');
    expect(formatted).toContain('12,450,000');
  });

  it('uses Arabic locale formatting without changing the stored integer', () => {
    const formatted = formatMinorUnits(8_300, 'USD', 'ar');
    expect(formatted).toContain('٨٣');
  });
});
