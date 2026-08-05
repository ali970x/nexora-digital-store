import {describe, expect, it} from 'vitest';

import {can, hasRole} from './permissions';

describe('authorization helpers', () => {
  it('keeps customer permissions least-privileged', () => {
    expect(can(['customer'], 'account.update')).toBe(true);
    expect(can(['customer'], 'admin.access')).toBe(false);
    expect(can(['customer'], 'reseller.access')).toBe(false);
  });

  it('grants a reseller portal access without admin access', () => {
    expect(can(['reseller'], 'reseller.access')).toBe(true);
    expect(can(['reseller'], 'settings.manage')).toBe(false);
  });

  it('allows owners every declared permission', () => {
    expect(can(['owner'], 'platform.own')).toBe(true);
    expect(can(['owner'], 'finance.manage')).toBe(true);
    expect(can(['owner'], 'fulfillment.manage')).toBe(true);
  });

  it('supports users with multiple roles', () => {
    expect(can(['customer', 'affiliate'], 'affiliate.access')).toBe(true);
    expect(hasRole(['customer', 'support'], ['support', 'admin'])).toBe(true);
  });
});
