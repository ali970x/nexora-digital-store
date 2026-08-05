import {BadgeCheck} from 'lucide-react';
import {getTranslations, setRequestLocale} from 'next-intl/server';

import {StorefrontShell} from '@/components/layout/storefront-shell';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/surfaces';
import {requirePermission} from '@/features/auth/server/authorization';

export const dynamic = 'force-dynamic';

export default async function ResellerPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'reseller.access');
  const t = await getTranslations('ProtectedAreas.reseller');
  return (
    <StorefrontShell>
      <main id="main" className="protected-area">
        <Card>
          <CardHeader>
            <span className="account-card-icon">
              <BadgeCheck />
            </span>
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('description')}</p>
          </CardContent>
        </Card>
      </main>
    </StorefrontShell>
  );
}
