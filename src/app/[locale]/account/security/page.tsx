import {getTranslations, setRequestLocale} from 'next-intl/server';

import {SecurityCenter} from '@/features/account/components/account-forms';
import {touchSessionAction} from '@/features/auth/server/actions';
import {requireUser} from '@/features/auth/server/authorization';
import {createClient} from '@/lib/supabase/server';

export default async function SecurityPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const context = await requireUser(locale);
  const t = await getTranslations('Account.security');
  await touchSessionAction(locale);
  const supabase = await createClient();
  const [{data: factorData}, {data: sessions}] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase
      .from('user_sessions')
      .select('id, device_name, user_agent, last_seen_at, revoked_at')
      .eq('profile_id', context.user.id)
      .order('last_seen_at', {ascending: false})
  ]);
  const factors = (factorData?.totp ?? []).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name,
    status: factor.status
  }));
  return (
    <div className="account-page">
      <header className="account-page-heading">
        <div>
          <p>{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <span>{t('description')}</span>
        </div>
      </header>
      <SecurityCenter factors={factors} sessions={sessions ?? []} />
    </div>
  );
}
