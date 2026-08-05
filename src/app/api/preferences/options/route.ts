import {NextResponse} from 'next/server';

import {generatedLocales} from '@/i18n/generated-locales';
import {createClient} from '@/lib/supabase/server';
import {currencies as fallbackCurrencies} from '@/lib/money';

const fallbackLocales = [
  {code: 'ar', nativeName: 'العربية', direction: 'rtl'},
  {code: 'en', nativeName: 'English', direction: 'ltr'}
] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const [{data: localeRows}, {data: currencyRows}] = await Promise.all([
      supabase
        .from('locales')
        .select('code, native_name, direction')
        .eq('enabled', true)
        .order('sort_order'),
      supabase.from('currencies').select('code, name, symbol').eq('enabled', true).order('code')
    ]);
    return NextResponse.json({
      locales: (localeRows ?? [])
        .filter((row) => generatedLocales.some((locale) => locale === row.code))
        .map((row) => ({code: row.code, nativeName: row.native_name, direction: row.direction})),
      currencies: (currencyRows ?? []).map((row) => ({
        code: row.code,
        name: row.name,
        symbol: row.symbol
      }))
    });
  } catch {
    return NextResponse.json({
      locales: fallbackLocales,
      currencies: fallbackCurrencies.map((code) => ({code, name: code, symbol: code}))
    });
  }
}
