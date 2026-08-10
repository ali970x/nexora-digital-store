import {z} from 'zod';

export const walletStatementFiltersSchema = z.object({
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional()
    .catch(undefined),
  type: z
    .enum([
      'topup',
      'top_up',
      'purchase',
      'refund',
      'commission',
      'affiliate_commission',
      'cashback',
      'bonus',
      'admin_adjustment',
      'hold',
      'release',
      'payout',
      'fee',
      'chargeback'
    ])
    .optional()
    .catch(undefined),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1)
});

export const adminWalletAdjustmentSchema = z.object({
  ownerId: z.uuid(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  signedAmount: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, 'amount_required'),
  reason: z.string().trim().min(8).max(500),
  idempotencyKey: z.uuid()
});

export const walletFreezeSchema = z.object({
  walletId: z.uuid(),
  frozen: z.coerce.boolean(),
  reason: z.string().trim().min(8).max(500),
  requestId: z.uuid()
});
