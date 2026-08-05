import {describe, expect, it} from 'vitest';

import {resolveLocalePreference} from './locale-detection';

describe('locale detection', () => {
  it('prefers the locale cookie over the browser header', () => {
    expect(resolveLocalePreference('en', 'ar-LB,ar;q=0.9')).toBe('en');
    expect(resolveLocalePreference('ar', 'en-US,en;q=0.9')).toBe('ar');
  });

  it('uses the Accept-Language header when no cookie exists', () => {
    expect(resolveLocalePreference(undefined, 'ar-LB,ar;q=0.9,en;q=0.8')).toBe('ar');
  });

  it('falls back to English', () => {
    expect(resolveLocalePreference(undefined, null)).toBe('en');
    expect(resolveLocalePreference('fr', 'fr-FR')).toBe('en');
  });
});
