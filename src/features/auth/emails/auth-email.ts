import ar from '../../../../messages/ar.json';
import en from '../../../../messages/en.json';

type AuthEmailKind = 'verify' | 'magicLink' | 'passwordReset';
type Locale = 'ar' | 'en';

const catalogs = {ar, en} as const;

export function renderAuthEmail(kind: AuthEmailKind, locale: Locale, actionUrl: string) {
  const copy = catalogs[locale].AuthEmails[kind];
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  return {
    subject: copy.subject,
    text: `${copy.title}\n\n${copy.description}\n\n${actionUrl}`,
    html: `<!doctype html><html lang="${locale}" dir="${direction}"><body><main><h1>${copy.title}</h1><p>${copy.description}</p><p><a href="${actionUrl}">${copy.action}</a></p><small>${copy.expiry}</small></main></body></html>`
  };
}
