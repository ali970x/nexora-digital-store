import {readFileSync} from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

import type {AppLocale} from '@/i18n/routing';
import {formatMinorUnits} from '@/lib/money';
import type {WalletStatementItem} from '../types';

const arabicFont = readFileSync(
  path.join(
    process.cwd(),
    'node_modules',
    '@embedpdf',
    'fonts-arabic',
    'fonts',
    'NotoNaskhArabic-Regular.ttf'
  )
);

const labels = {
  en: {
    title: 'Nexora wallet statement',
    generated: 'Generated',
    date: 'Date',
    type: 'Type',
    reference: 'Reference',
    amount: 'Amount',
    empty: 'No transactions match these filters.'
  },
  ar: {
    title: 'كشف محفظة نكسورا',
    generated: 'تاريخ الإنشاء',
    date: 'التاريخ',
    type: 'النوع',
    reference: 'المرجع',
    amount: 'المبلغ',
    empty: 'لا توجد حركات تطابق هذه الفلاتر.'
  }
} as const;

export function createStatementCsv(locale: AppLocale, rows: WalletStatementItem[]): string {
  const copy = labels[locale];
  const columns = [copy.date, copy.type, copy.reference, copy.amount, 'Currency', 'ID'];
  const body = rows.map((row) => [
    new Date(row.created_at).toISOString(),
    row.type,
    row.reference_type,
    String(row.signedAmount),
    row.currency_code,
    row.id
  ]);
  return `\uFEFF${[columns, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n')}`;
}

export async function createStatementPdf(
  locale: AppLocale,
  rows: WalletStatementItem[]
): Promise<Uint8Array> {
  const copy = labels[locale];
  const rtl = locale === 'ar';
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    bufferPages: true,
    info: {Title: copy.title}
  });
  const chunks: Uint8Array[] = [];
  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
  const completed = new Promise<Uint8Array>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  if (rtl) doc.registerFont('NexoraArabic', arabicFont).font('NexoraArabic');
  const text = (value: string, options: PDFKit.Mixins.TextOptions = {}) =>
    doc.text(value, {...options, align: rtl ? 'right' : options.align});

  doc.fontSize(22);
  text(copy.title);
  doc.moveDown(0.4).fontSize(9).fillColor('gray');
  text(
    `${copy.generated}: ${new Intl.DateTimeFormat(locale, {dateStyle: 'full', timeStyle: 'short'}).format(new Date())}`
  );
  doc.moveDown().fillColor('black').fontSize(10);
  if (!rows.length) text(copy.empty);
  for (const row of rows) {
    if (doc.y > 730) doc.addPage();
    doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor('lightgray').stroke();
    doc.moveDown(0.5);
    text(`${copy.amount}: ${formatMinorUnits(row.signedAmount, row.currency_code, locale)}`);
    doc.fontSize(8).fillColor('gray');
    text(
      `${copy.type}: ${row.type} · ${copy.date}: ${new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(row.created_at))}`
    );
    text(`${copy.reference}: ${row.reference_type} · ${row.id}`);
    doc.fontSize(10).fillColor('black').moveDown(0.5);
  }
  doc.end();
  return completed;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
