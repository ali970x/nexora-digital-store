'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Search,
  ShieldCheck,
  Snowflake,
  UnlockKeyhole,
  UserRound
} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {toast} from 'sonner';
import {z} from 'zod';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/form-controls';
import {Badge, Card, EmptyState} from '@/components/ui/surfaces';
import {Link} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';
import {formatMinorUnits} from '@/lib/money';
import {adminWalletAdjustmentSchema} from '../schemas/wallet';
import {adjustWalletAction, setWalletFrozenAction} from '../server/actions';
import type {AdminWalletOwner, WalletOverview} from '../types';

type AdjustmentValues = z.input<typeof adminWalletAdjustmentSchema>;

export function AdminWalletConsole({
  owners,
  selectedOwner,
  overview
}: {
  owners: AdminWalletOwner[];
  selectedOwner: AdminWalletOwner | null;
  overview: WalletOverview | null;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('WalletAdmin');
  const [pending, startTransition] = useTransition();
  const [initialKey] = useState(() => crypto.randomUUID());
  const currencies = overview?.balances.map((balance) => balance.currencyCode) ?? [];
  const form = useForm<AdjustmentValues>({
    resolver: zodResolver(adminWalletAdjustmentSchema),
    defaultValues: {
      ownerId: selectedOwner?.id ?? '',
      currencyCode: currencies[0] ?? 'USD',
      signedAmount: 0,
      reason: '',
      idempotencyKey: initialKey
    }
  });
  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await adjustWalletAction(locale, values);
      if (result.ok) {
        toast.success(t('adjustment.success'));
        form.reset({...values, signedAmount: 0, reason: '', idempotencyKey: crypto.randomUUID()});
      } else toast.error(t(`errors.${result.error}`));
    });
  });

  return (
    <div className="admin-wallet-layout">
      <aside className="admin-wallet-owners">
        <form method="get" className="admin-wallet-search">
          <Search aria-hidden="true" />
          <input name="q" placeholder={t('search')} />
        </form>
        {owners.map((owner) => (
          <Link
            key={owner.id}
            href={`/admin/wallets?owner=${owner.id}`}
            locale={locale}
            data-active={owner.id === selectedOwner?.id || undefined}
          >
            <span>
              <UserRound aria-hidden="true" />
            </span>
            <span>
              <strong>{owner.displayName}</strong>
              <small>{owner.contactHint ?? owner.id.slice(0, 12)}</small>
            </span>
          </Link>
        ))}
      </aside>

      <section className="admin-wallet-workspace">
        {!selectedOwner || !overview ? (
          <EmptyState title={t('empty.title')} description={t('empty.description')} />
        ) : (
          <>
            <div className="admin-wallet-owner-heading">
              <div>
                <span className="section-eyebrow">{t('ledger')}</span>
                <h2>{selectedOwner.displayName}</h2>
                <p>{selectedOwner.id}</p>
              </div>
              <Badge tone="accent">
                <ShieldCheck aria-hidden="true" />
                {t('audited')}
              </Badge>
            </div>

            <div className="wallet-export-actions">
              <Button asChild variant="outline" size="sm">
                <a href={`/${locale}/admin/wallets/statement.csv?owner=${selectedOwner.id}`}>
                  <FileSpreadsheet aria-hidden="true" />
                  {t('export.csv')}
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/${locale}/admin/wallets/statement.pdf?owner=${selectedOwner.id}`}>
                  <Download aria-hidden="true" />
                  {t('export.pdf')}
                </a>
              </Button>
            </div>

            <div className="admin-wallet-balances">
              {overview.balances.map((balance) => {
                const wallet = selectedOwner.wallets.find(
                  (row) =>
                    row.currency_code === balance.currencyCode && row.account_type === 'customer'
                );
                return (
                  <Card key={balance.currencyCode}>
                    <div>
                      <strong>{balance.currencyCode}</strong>
                      {wallet?.locked ? (
                        <Badge tone="danger">
                          <LockKeyhole aria-hidden="true" />
                          {t('frozen')}
                        </Badge>
                      ) : null}
                    </div>
                    <b>{formatMinorUnits(balance.available, balance.currencyCode, locale)}</b>
                    <small>
                      {t('held')}: {formatMinorUnits(balance.held, balance.currencyCode, locale)}
                    </small>
                    {wallet ? <FreezeControl walletId={wallet.id} frozen={wallet.locked} /> : null}
                  </Card>
                );
              })}
            </div>

            <Card className="admin-adjustment-card">
              <div>
                <Snowflake aria-hidden="true" />
                <div>
                  <h3>{t('adjustment.title')}</h3>
                  <p>{t('adjustment.description')}</p>
                </div>
              </div>
              <form onSubmit={(event) => void submit(event)}>
                <label>
                  {t('adjustment.currency')}
                  <select {...form.register('currencyCode')}>
                    {currencies.map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                  </select>
                </label>
                <Input
                  label={t('adjustment.amount')}
                  helper={t('adjustment.amountHelp')}
                  type="number"
                  error={form.formState.errors.signedAmount?.message}
                  {...form.register('signedAmount')}
                />
                <Input
                  label={t('adjustment.reason')}
                  helper={t('adjustment.reasonHelp')}
                  error={form.formState.errors.reason?.message}
                  {...form.register('reason')}
                />
                <Button type="submit" variant="gradient" loading={pending}>
                  {t('adjustment.submit')}
                </Button>
              </form>
            </Card>

            <div className="admin-ledger-preview">
              <h3>{t('recent')}</h3>
              {overview.transactions.map((transaction) => (
                <div key={transaction.id}>
                  <span>
                    <strong>{t(`types.${transaction.type}`)}</strong>
                    <small>{transaction.id}</small>
                  </span>
                  <b data-direction={transaction.direction}>
                    {transaction.signedAmount > 0 ? '+' : ''}
                    {formatMinorUnits(transaction.signedAmount, transaction.currency_code, locale)}
                  </b>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function FreezeControl({walletId, frozen}: {walletId: string; frozen: boolean}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('WalletAdmin');
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <div className="wallet-freeze-control">
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t('freeze.reason')}
        aria-label={t('freeze.reason')}
      />
      <Button
        type="button"
        variant={frozen ? 'outline' : 'destructive'}
        size="sm"
        loading={pending}
        disabled={reason.trim().length < 8}
        onClick={() =>
          startTransition(async () => {
            const result = await setWalletFrozenAction(locale, {
              walletId,
              frozen: !frozen,
              reason,
              requestId: crypto.randomUUID()
            });
            if (result.ok) {
              toast.success(t(frozen ? 'freeze.unfrozen' : 'freeze.frozen'));
              setReason('');
            } else toast.error(t(`errors.${result.error}`));
          })
        }
      >
        {frozen ? <UnlockKeyhole aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
        {t(frozen ? 'freeze.unfreeze' : 'freeze.freeze')}
      </Button>
    </div>
  );
}
