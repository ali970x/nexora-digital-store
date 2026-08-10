import {describe, expect, it} from 'vitest';

import {adminWalletAdjustmentSchema, walletStatementFiltersSchema} from './wallet';

describe('wallet validation', () => {
  it('requires an idempotency key and a meaningful adjustment reason', () => {
    expect(
      adminWalletAdjustmentSchema.safeParse({
        ownerId: crypto.randomUUID(),
        currencyCode: 'USD',
        signedAmount: -250,
        reason: 'Approved refund correction',
        idempotencyKey: crypto.randomUUID()
      }).success
    ).toBe(true);
    expect(
      adminWalletAdjustmentSchema.safeParse({
        ownerId: crypto.randomUUID(),
        currencyCode: 'USD',
        signedAmount: 0,
        reason: 'short',
        idempotencyKey: ''
      }).success
    ).toBe(false);
  });

  it('drops invalid statement filters instead of trusting request values', () => {
    const parsed = walletStatementFiltersSchema.parse({currency: 'usd', type: 'mint_money'});
    expect(parsed.currency).toBeUndefined();
    expect(parsed.type).toBeUndefined();
  });
});
