import {getTranslations, setRequestLocale} from 'next-intl/server';

import {PreferencesForm} from '@/features/account/components/account-forms';
import {requireUser} from '@/features/auth/server/authorization';
import {createClient} from '@/lib/supabase/server';

export default async function PreferencesPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const context = await requireUser(locale);
  const t = await getTranslations('Account.preferences');
  const supabase = await createClient();
  const [{data: profile}, {data: locales}, {data: currencies}] = await Promise.all([
    supabase
      .from('profiles')
      .select('locale_code, currency_code, timezone')
      .eq('id', context.user.id)
      .maybeSingle(),
    supabase.from('locales').select('code, native_name').eq('enabled', true).order('sort_order'),
    supabase.from('currencies').select('code, name').eq('enabled', true).order('code')
  ]);
  return (
    <div className="account-page">
      <header className="account-page-heading">
        <div>
          <p>{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <span>{t('description')}</span>
        </div>
      </header>
      <PreferencesForm
        initial={{
          localeCode: profile?.locale_code ?? locale,
          currencyCode: profile?.currency_code ?? 'USD',
          timezone: profile?.timezone ?? 'UTC'
        }}
        locales={locales ?? []}
        currencies={currencies ?? []}
      />
    </div>
  );
}
