import {getTranslations, setRequestLocale} from 'next-intl/server';

import {requirePermission} from '@/features/auth/server/authorization';
import {AdminWalletConsole} from '@/features/wallet/components/admin-wallet-console';
import {getAdminWalletOwners, getWalletOverview} from '@/features/wallet/server/queries';
import type {AppLocale} from '@/i18n/routing';

export default async function AdminWalletsPage({
  params,
  searchParams
}: {
  params: Promise<{locale: AppLocale}>;
  searchParams: Promise<{owner?: string; q?: string}>;
}) {
  const {locale} = await params;
  const values = await searchParams;
  setRequestLocale(locale);
  await requirePermission(locale, 'wallet.manage');
  const [owners, t] = await Promise.all([
    getAdminWalletOwners(values.q),
    getTranslations({locale, namespace: 'WalletAdmin'})
  ]);
  const selectedOwner = owners.find((owner) => owner.id === values.owner) ?? owners[0] ?? null;
  const overview = selectedOwner ? await getWalletOverview(selectedOwner.id, {pageSize: 50}) : null;
  return (
    <div className="account-page admin-wallet-page">
      <header className="account-page-heading">
        <div>
          <span className="section-eyebrow">{t('eyebrow')}</span>
          <h1>{t('title')}</h1>
          <p>{t('description')}</p>
        </div>
      </header>
      <AdminWalletConsole owners={owners} selectedOwner={selectedOwner} overview={overview} />
    </div>
  );
}
