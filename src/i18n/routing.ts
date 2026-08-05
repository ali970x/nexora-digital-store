import {defineRouting} from 'next-intl/routing';
import {generatedLocales} from './generated-locales';

export const routing = defineRouting({
  locales: generatedLocales,
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true,
  localeCookie: {name: 'NEXT_LOCALE', sameSite: 'lax'}
});

export type AppLocale = (typeof routing.locales)[number];
