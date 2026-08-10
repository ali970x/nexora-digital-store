import {z} from 'zod';

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  category: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
  type: z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,47}$/)
    .optional()
    .catch(undefined),
  region: z
    .string()
    .regex(/^[A-Z0-9-]{2,16}$/)
    .optional()
    .catch(undefined),
  min: z.coerce.number().int().nonnegative().optional().catch(undefined),
  max: z.coerce.number().int().nonnegative().optional().catch(undefined),
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'newest'])
    .default('relevance')
    .catch('relevance'),
  page: z.coerce.number().int().min(1).default(1).catch(1)
});

export const serviceQuoteSchema = z
  .object({
    locale: z.string().min(2).max(10),
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    requirements: z.record(z.string(), z.union([z.string(), z.number()])),
    budgetMinAmount: z.number().int().nonnegative().optional(),
    budgetMaxAmount: z.number().int().nonnegative().optional(),
    currencyCode: z.string().length(3).optional(),
    desiredDueAt: z.string().datetime().optional()
  })
  .refine(
    (value) =>
      value.budgetMinAmount === undefined ||
      (value.budgetMaxAmount !== undefined && value.budgetMaxAmount >= value.budgetMinAmount),
    {path: ['budgetMaxAmount'], message: 'invalid_budget_range'}
  );

export const recordRecentViewSchema = z.object({productId: z.string().uuid()});
