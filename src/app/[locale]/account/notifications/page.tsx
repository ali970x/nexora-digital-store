import {getTranslations, setRequestLocale} from 'next-intl/server';

import {NotificationPreferences} from '@/features/account/components/account-forms';
import {requireUser} from '@/features/auth/server/authorization';
import {createClient} from '@/lib/supabase/server';

export default async function NotificationsPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const context = await requireUser(locale);
  const t = await getTranslations('Account.notifications');
  const supabase = await createClient();
  const {data} = await supabase
    .from('notification_preferences')
    .select('channel, transactional, order_updates, promotions')
    .eq('profile_id', context.user.id)
    .order('channel');
  return (
    <div className="account-page">
      <header className="account-page-heading">
        <div>
          <p>{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <span>{t('description')}</span>
        </div>
      </header>
      <NotificationPreferences preferences={data ?? []} />
    </div>
  );
}
