import {ArrowDownLeft, ArrowLeft, ArrowUpRight, Fingerprint, ShieldCheck} from 'lucide-react';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';

import {CopyButton} from '@/components/ui/advanced';
import {Badge, Card} from '@/components/ui/surfaces';
import {requireUser} from '@/features/auth/server/authorization';
import {getWalletTransaction} from '@/features/wallet/server/queries';
import {formatDate} from '@/i18n/formatters';
import {Link} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';
import {formatMinorUnits} from '@/lib/money';

export default async function WalletTransactionPage({
  params
}: {
  params: Promise<{locale: AppLocale; id: string}>;
}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const context = await requireUser(locale);
  const [transaction, t] = await Promise.all([
    getWalletTransaction(context.user.id, id),
    getTranslations({locale, namespace: 'Wallet'})
  ]);
  if (!transaction) notFound();
  return (
    <div className="wallet-detail-page account-page">
      <Link href="/account/wallet" locale={locale} className="wallet-back-link">
        <ArrowLeft aria-hidden="true" className="rtl:-scale-x-100" />
        {t('detail.back')}
      </Link>
      <Card className="wallet-transaction-detail-card">
        <div className="wallet-detail-icon" data-direction={transaction.direction}>
          {transaction.direction === 'credit' ? (
            <ArrowDownLeft aria-hidden="true" />
          ) : (
            <ArrowUpRight aria-hidden="true" />
          )}
        </div>
        <Badge tone={transaction.direction === 'credit' ? 'success' : 'neutral'}>
          {t(`types.${transaction.type}`)}
        </Badge>
        <h1>
          {transaction.signedAmount > 0 ? '+' : ''}
          {formatMinorUnits(transaction.signedAmount, transaction.currency_code, locale)}
        </h1>
        <p>{formatDate(transaction.created_at, locale)}</p>
        <dl className="wallet-detail-grid">
          <div>
            <dt>{t('detail.status')}</dt>
            <dd>
              <ShieldCheck aria-hidden="true" />
              {t(`status.${transaction.status}`)}
            </dd>
          </div>
          <div>
            <dt>{t('detail.reference')}</dt>
            <dd>{transaction.reference_type}</dd>
          </div>
          <div>
            <dt>{t('detail.transactionId')}</dt>
            <dd>
              <Fingerprint aria-hidden="true" />
              <code>{transaction.id}</code>
              <CopyButton
                value={transaction.id}
                label={t('detail.copy')}
                copiedMessage={t('detail.copied')}
              />
            </dd>
          </div>
          {transaction.reason ? (
            <div>
              <dt>{t('detail.reason')}</dt>
              <dd>{transaction.reason}</dd>
            </div>
          ) : null}
        </dl>
      </Card>
    </div>
  );
}
