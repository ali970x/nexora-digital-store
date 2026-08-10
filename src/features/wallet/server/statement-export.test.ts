// @vitest-environment node

import {describe, expect, it} from 'vitest';

import {createStatementCsv, createStatementPdf} from './statement-export';

describe('wallet statement exports', () => {
  it('produces an Excel-friendly UTF-8 CSV', () => {
    const csv = createStatementCsv('ar', []);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('التاريخ');
  });

  it.each(['en', 'ar'] as const)(
    'produces a valid %s PDF with embedded typography',
    async (locale) => {
      const pdf = await createStatementPdf(locale, []);
      expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe('%PDF');
      expect(pdf.byteLength).toBeGreaterThan(500);
    }
  );
});
