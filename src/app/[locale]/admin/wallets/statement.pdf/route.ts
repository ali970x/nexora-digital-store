import {z} from 'zod';

import {requirePermission} from '@/features/auth/server/authorization';
import {walletExportResponse} from '@/features/wallet/server/export-handler';
import type {AppLocale} from '@/i18n/routing';
import {routing} from '@/i18n/routing';

export const runtime = 'nodejs';

export async function GET(request: Request, {params}: {params: Promise<{locale: string}>}) {
  const {locale: requestedLocale} = await params;
  const locale = routing.locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : routing.defaultLocale;
  await requirePermission(locale, 'wallet.manage');
  const owner = z.uuid().safeParse(new URL(request.url).searchParams.get('owner'));
  if (!owner.success) return new Response(null, {status: 400});
  return walletExportResponse(request, locale, owner.data, 'pdf');
}
