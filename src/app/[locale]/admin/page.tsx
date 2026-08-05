import {ShieldCheck} from 'lucide-react';
import {getTranslations, setRequestLocale} from 'next-intl/server';

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/surfaces';
import {requirePermission} from '@/features/auth/server/authorization';

export default async function AdminPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'admin.access');
  const t = await getTranslations('ProtectedAreas.admin');
  return (
    <div className="account-page">
      <header className="account-page-heading">
        <div>
          <p>{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <span>{t('description')}</span>
        </div>
      </header>
      <Card>
        <CardHeader>
          <span className="account-card-icon">
            <ShieldCheck />
          </span>
          <CardTitle>{t('guardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="account-muted">{t('guardDescription')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
