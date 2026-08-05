'use client';

import {useQuery} from '@tanstack/react-query';

type PreferenceOptions = {
  locales: Array<{code: string; nativeName: string; direction: 'ltr' | 'rtl'}>;
  currencies: Array<{code: string; name: string; symbol: string}>;
};

const fallback: PreferenceOptions = {
  locales: [
    {code: 'ar', nativeName: '', direction: 'rtl'},
    {code: 'en', nativeName: '', direction: 'ltr'}
  ],
  currencies: ['USD', 'LBP', 'EUR', 'SAR', 'AED'].map((code) => ({code, name: code, symbol: code}))
};

export function usePreferenceOptions() {
  return useQuery({
    queryKey: ['preference-options'],
    queryFn: async () => {
      const response = await fetch('/api/preferences/options');
      if (!response.ok) throw new Error('preference_options_unavailable');
      return (await response.json()) as PreferenceOptions;
    },
    initialData: fallback,
    staleTime: 300_000
  });
}
