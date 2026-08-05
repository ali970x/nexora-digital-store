import {getTranslations, setRequestLocale} from 'next-intl/server';

import {ProfileForm} from '@/features/account/components/account-forms';
import {requireUser} from '@/features/auth/server/authorization';
import {createClient} from '@/lib/supabase/server';

export default async function ProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const context = await requireUser(locale);
  const t = await getTranslations('Account.profile');
  const supabase = await createClient();
  const {data} = await supabase
    .from('profiles')
    .select('display_name, phone, country_code, timezone, marketing_consent')
    .eq('id', context.user.id)
    .maybeSingle();
  return (
    <div className="account-page">
      <header className="account-page-heading">
        <div>
          <p>{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <span>{t('description')}</span>
        </div>
      </header>
      <ProfileForm
        initial={{
          displayName: data?.display_name ?? '',
          phone: data?.phone ?? '',
          countryCode: data?.country_code ?? '',
          timezone: data?.timezone ?? 'UTC',
          marketingConsent: data?.marketing_consent ?? false
        }}
      />
    </div>
  );
}
