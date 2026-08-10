import type {WalletRow, WalletTransactionRow} from '@/lib/supabase/database.types';

export type WalletBalance = {
  currencyCode: string;
  available: number;
  held: number;
  availableWalletId: string | null;
  holdWalletId: string | null;
  frozen: boolean;
};

export type WalletStatementItem = WalletTransactionRow & {
  signedAmount: number;
  direction: 'credit' | 'debit';
  walletId: string;
};

export type WalletOverview = {
  balances: WalletBalance[];
  transactions: WalletStatementItem[];
  totalTransactions: number;
};

export type AdminWalletOwner = {
  id: string;
  displayName: string;
  contactHint: string | null;
  wallets: WalletRow[];
};
