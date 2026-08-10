import {describe, expect, it} from 'vitest';

import {requiresMfaChallenge} from './mfa';

describe('requiresMfaChallenge', () => {
  it('requires a challenge when an enrolled factor can upgrade an aal1 session', () => {
    expect(requiresMfaChallenge({currentLevel: 'aal1', nextLevel: 'aal2'})).toBe(true);
  });

  it('allows sessions that already completed MFA', () => {
    expect(requiresMfaChallenge({currentLevel: 'aal2', nextLevel: 'aal2'})).toBe(false);
  });

  it('allows users without an enrolled MFA factor', () => {
    expect(requiresMfaChallenge({currentLevel: 'aal1', nextLevel: 'aal1'})).toBe(false);
  });

  it('does not challenge when assurance data is unavailable', () => {
    expect(requiresMfaChallenge(null)).toBe(false);
  });
});
