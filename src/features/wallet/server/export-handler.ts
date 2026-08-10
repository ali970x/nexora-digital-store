import {getWalletStatementExport} from './queries';
import {walletStatementFiltersSchema} from '../schemas/wallet';
import {createStatementCsv, createStatementPdf} from './statement-export';
import type {AppLocale} from '@/i18n/routing';

export async function walletExportResponse(
  request: Request,
  locale: AppLocale,
  ownerId: string,
  format: 'csv' | 'pdf'
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = walletStatementFiltersSchema.parse(Object.fromEntries(url.searchParams));
  const rows = await getWalletStatementExport(ownerId, parsed);
  const date = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    return new Response(createStatementCsv(locale, rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="nexora-wallet-${date}.csv"`,
        'cache-control': 'private, no-store'
      }
    });
  }
  const pdf = await createStatementPdf(locale, rows);
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);
  return new Response(body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="nexora-wallet-${date}.pdf"`,
      'cache-control': 'private, no-store'
    }
  });
}
