'use server';

import {revalidatePath} from 'next/cache';

import {requirePermission} from '@/features/auth/server/authorization';
import {createClient} from '@/lib/supabase/server';
import {adminWalletAdjustmentSchema, walletFreezeSchema} from '../schemas/wallet';

export type WalletActionResult = {ok: true; transactionId?: string} | {ok: false; error: string};

export async function adjustWalletAction(
  locale: string,
  input: unknown
): Promise<WalletActionResult> {
  await requirePermission(locale, 'wallet.manage');
  const parsed = adminWalletAdjustmentSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: 'invalid_adjustment'};
  const supabase = await createClient();
  const {data, error} = await supabase.rpc('wallet_admin_adjust', {
    p_owner_id: parsed.data.ownerId,
    p_currency_code: parsed.data.currencyCode,
    p_signed_amount: parsed.data.signedAmount,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_reason: parsed.data.reason
  });
  if (error) return {ok: false, error: safeWalletError(error.message)};
  revalidatePath(`/${locale}/admin/wallets`);
  revalidatePath(`/${locale}/account/wallet`);
  return {ok: true, transactionId: data.id};
}

export async function setWalletFrozenAction(
  locale: string,
  input: unknown
): Promise<WalletActionResult> {
  await requirePermission(locale, 'wallet.manage');
  const parsed = walletFreezeSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: 'invalid_freeze'};
  const supabase = await createClient();
  const {error} = await supabase.rpc('wallet_set_frozen', {
    p_wallet_id: parsed.data.walletId,
    p_frozen: parsed.data.frozen,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.requestId
  });
  if (error) return {ok: false, error: safeWalletError(error.message)};
  revalidatePath(`/${locale}/admin/wallets`);
  return {ok: true};
}

function safeWalletError(message: string): string {
  const allowed = [
    'wallet_insufficient_funds',
    'wallet_frozen',
    'wallet_idempotency_conflict',
    'wallet_adjustment_reason_required'
  ];
  return allowed.find((code) => message.includes(code)) ?? 'operation_failed';
}
