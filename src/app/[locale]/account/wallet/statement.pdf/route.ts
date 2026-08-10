import {requireUser} from '@/features/auth/server/authorization';
import {walletExportResponse} from '@/features/wallet/server/export-handler';
import type {AppLocale} from '@/i18n/routing';
import {routing} from '@/i18n/routing';

export const runtime = 'nodejs';

export async function GET(request: Request, {params}: {params: Promise<{locale: string}>}) {
  const {locale: requestedLocale} = await params;
  const locale = routing.locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : routing.defaultLocale;
  const context = await requireUser(locale);
  return walletExportResponse(request, locale, context.user.id, 'pdf');
}
