import {generatedLocales} from './generated-locales';

export type LaunchLocale = (typeof generatedLocales)[number];

export function resolveLocalePreference(
  cookieLocale: string | undefined,
  acceptLanguage: string | null
): LaunchLocale {
  if (generatedLocales.some((locale) => locale === cookieLocale))
    return cookieLocale as LaunchLocale;
  const requested = (acceptLanguage?.toLowerCase() ?? '')
    .split(',')
    .map((item) => item.trim().split(';')[0])
    .filter((item): item is string => Boolean(item));
  const match = generatedLocales.find((locale) =>
    requested.some(
      (item) => item === locale.toLowerCase() || item.startsWith(`${locale.toLowerCase()}-`)
    )
  );
  return match ?? 'en';
}
