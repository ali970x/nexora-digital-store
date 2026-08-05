import type {AppLocale} from '@/i18n/routing';

export const currencies = ['USD', 'LBP', 'EUR', 'SAR', 'AED'] as const;
export type CurrencyCode = string;

export function formatMinorUnits(amount: number, currency: CurrencyCode, locale: AppLocale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-LB' : locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'LBP' ? 0 : 2
  }).format(amount / (currency === 'LBP' ? 1 : 100));
}
