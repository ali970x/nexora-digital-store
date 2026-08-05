import {BellRing, KeyRound, Languages, UserRound} from 'lucide-react';
import {getTranslations, setRequestLocale} from 'next-intl/server';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/surfaces';
import {requireUser} from '@/features/auth/server/authorization';
import {Link} from '@/i18n/navigation';

export default async function AccountPage({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{denied?: string}>;
}) {
  const {locale} = await params;
  const {denied} = await searchParams;
  setRequestLocale(locale);
  const context = await requireUser(locale);
  const t = await getTranslations('Account.overview');
  const cards = [
    {key: 'profile', href: '/account/profile', icon: UserRound},
    {key: 'security', href: '/account/security', icon: KeyRound},
    {key: 'notifications', href: '/account/notifications', icon: BellRing},
    {key: 'preferences', href: '/account/preferences', icon: Languages}
  ] as const;
  return (
    <div className="account-page">
      <header className="account-page-heading">
        <div>
          <p>{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <span>{t('description')}</span>
        </div>
        <span className="account-role-chip">
          {t('role', {role: t(`roles.${context.roles[0] ?? 'customer'}`)})}
        </span>
      </header>
      {denied ? (
        <div className="account-denied">
          <ShieldMessage />
          {t('denied')}
        </div>
      ) : null}
      <div className="account-overview-grid">
        {cards.map(({key, href, icon: Icon}) => (
          <Link href={href} key={key}>
            <Card interactive>
              <CardHeader>
                <span className="account-card-icon">
                  <Icon aria-hidden="true" />
                </span>
                <CardTitle>{t(`${key}.title`)}</CardTitle>
                <CardDescription>{t(`${key}.description`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="account-card-link">{t('open')}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShieldMessage() {
  return <KeyRound aria-hidden="true" />;
}
