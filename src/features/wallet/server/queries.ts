import {createClient} from '@/lib/supabase/server';
import type {WalletRow, WalletTransactionRow} from '@/lib/supabase/database.types';
import type {AdminWalletOwner, WalletBalance, WalletOverview, WalletStatementItem} from '../types';

export type WalletFilters = {
  currency?: string;
  type?: WalletTransactionRow['type'];
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function getWalletOverview(
  profileId: string,
  filters: WalletFilters = {}
): Promise<WalletOverview> {
  const supabase = await createClient();
  const [{data: currencies, error: currencyError}, {data: wallets, error: walletError}] =
    await Promise.all([
      supabase.from('currencies').select('code').eq('enabled', true).order('sort_order'),
      supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', profileId)
        .in('account_type', ['customer', 'customer_hold'])
        .order('currency_code')
    ]);
  if (currencyError || walletError) throw new Error('wallet_overview_failed');

  const walletRows = wallets ?? [];
  const balances: WalletBalance[] = (currencies ?? []).map(({code}) => {
    const available = walletRows.find(
      (wallet) => wallet.currency_code === code && wallet.account_type === 'customer'
    );
    const held = walletRows.find(
      (wallet) => wallet.currency_code === code && wallet.account_type === 'customer_hold'
    );
    return {
      currencyCode: code,
      available: available?.cached_balance ?? 0,
      held: held?.cached_balance ?? 0,
      availableWalletId: available?.id ?? null,
      holdWalletId: held?.id ?? null,
      frozen: available?.locked ?? false
    };
  });

  const availableWallets = walletRows.filter((wallet) => wallet.account_type === 'customer');
  const availableIds = availableWallets.map((wallet) => wallet.id);
  if (!availableIds.length) return {balances, transactions: [], totalTransactions: 0};

  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  let query = supabase
    .from('wallet_transactions')
    .select('*', {count: 'exact'})
    .or(
      `debit_wallet_id.in.(${availableIds.join(',')}),credit_wallet_id.in.(${availableIds.join(',')})`
    )
    .order('created_at', {ascending: false})
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filters.currency) query = query.eq('currency_code', filters.currency);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);
  const {data: transactions, error: transactionError, count} = await query;
  if (transactionError) throw new Error('wallet_statement_failed');
  return {
    balances,
    transactions: (transactions ?? []).map((transaction) =>
      statementItem(transaction, availableWallets)
    ),
    totalTransactions: count ?? 0
  };
}

export async function getWalletTransaction(
  profileId: string,
  transactionId: string
): Promise<WalletStatementItem | null> {
  const supabase = await createClient();
  const {data: wallets, error: walletError} = await supabase
    .from('wallets')
    .select('*')
    .eq('owner_id', profileId)
    .eq('account_type', 'customer');
  if (walletError) throw new Error('wallet_detail_failed');
  const availableWallets = wallets ?? [];
  if (!availableWallets.length) return null;
  const {data, error} = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle();
  if (error || !data) return null;
  return statementItem(data, availableWallets);
}

export async function getWalletStatementExport(
  profileId: string,
  filters: Omit<WalletFilters, 'page' | 'pageSize'> = {}
): Promise<WalletStatementItem[]> {
  const supabase = await createClient();
  const {data: wallets, error: walletError} = await supabase
    .from('wallets')
    .select('*')
    .eq('owner_id', profileId)
    .eq('account_type', 'customer');
  if (walletError) throw new Error('wallet_export_failed');
  const availableWallets = wallets ?? [];
  const walletIds = availableWallets.map((wallet) => wallet.id);
  if (!walletIds.length) return [];

  const result: WalletTransactionRow[] = [];
  const batchSize = 1000;
  for (let offset = 0; ; offset += batchSize) {
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .or(
        `debit_wallet_id.in.(${walletIds.join(',')}),credit_wallet_id.in.(${walletIds.join(',')})`
      )
      .order('created_at', {ascending: false})
      .range(offset, offset + batchSize - 1);
    if (filters.currency) query = query.eq('currency_code', filters.currency);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00.000Z`);
    if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);
    const {data, error} = await query;
    if (error) throw new Error('wallet_export_failed');
    result.push(...(data ?? []));
    if (!data || data.length < batchSize) break;
  }
  return result.map((transaction) => statementItem(transaction, availableWallets));
}

export async function getAdminWalletOwners(search?: string): Promise<AdminWalletOwner[]> {
  const supabase = await createClient();
  let profileQuery = supabase
    .from('profiles')
    .select('id,display_name,phone')
    .is('deleted_at', null)
    .order('created_at', {ascending: false})
    .limit(30);
  if (search?.trim()) profileQuery = profileQuery.ilike('display_name', `%${search.trim()}%`);
  const {data: profiles, error} = await profileQuery;
  if (error) throw new Error('admin_wallet_profiles_failed');
  const ids = (profiles ?? []).map((profile) => profile.id);
  if (!ids.length) return [];
  const {data: wallets, error: walletError} = await supabase
    .from('wallets')
    .select('*')
    .in('owner_id', ids)
    .in('account_type', ['customer', 'customer_hold'])
    .order('currency_code');
  if (walletError) throw new Error('admin_wallets_failed');
  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name ?? profile.id.slice(0, 8),
    contactHint: profile.phone,
    wallets: (wallets ?? []).filter((wallet) => wallet.owner_id === profile.id)
  }));
}

function statementItem(
  transaction: WalletTransactionRow,
  availableWallets: WalletRow[]
): WalletStatementItem {
  const availableIds = new Set(availableWallets.map((wallet) => wallet.id));
  const credited = availableIds.has(transaction.credit_wallet_id);
  return {
    ...transaction,
    signedAmount: credited ? transaction.amount : -transaction.amount,
    direction: credited ? 'credit' : 'debit',
    walletId: credited ? transaction.credit_wallet_id : transaction.debit_wallet_id
  };
}
