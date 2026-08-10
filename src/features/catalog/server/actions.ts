'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';

import {requirePermission, requireUser} from '@/features/auth/server/authorization';
import {createClient} from '@/lib/supabase/server';
import type {Json} from '@/lib/supabase/database.types';
import {catalogInputSchemaDefinition, buildProductInputSchema} from '../schemas/product-input';
import {recordRecentViewSchema, serviceQuoteSchema} from '../schemas/catalog';

export type CatalogActionResult = {ok: true; id?: string} | {ok: false; error: string};

export async function submitServiceQuote(input: unknown): Promise<CatalogActionResult> {
  const parsed = serviceQuoteSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: 'invalid_quote'};
  const context = await requireUser(parsed.data.locale);
  const supabase = await createClient();
  const {data: config, error: configError} = await supabase
    .from('service_product_configs')
    .select('requirement_schema')
    .eq('product_id', parsed.data.productId)
    .maybeSingle();
  if (configError || !config) return {ok: false, error: 'service_unavailable'};
  const definition = catalogInputSchemaDefinition.safeParse(config.requirement_schema);
  if (!definition.success) return {ok: false, error: 'invalid_service_configuration'};
  const requirements = buildProductInputSchema(definition.data).safeParse(parsed.data.requirements);
  if (!requirements.success) return {ok: false, error: 'invalid_requirements'};
  const {data, error} = await supabase
    .from('service_quote_requests')
    .insert({
      profile_id: context.user.id,
      product_id: parsed.data.productId,
      variant_id: parsed.data.variantId,
      requirements: requirements.data as Json,
      budget_min_amount: parsed.data.budgetMinAmount,
      budget_max_amount: parsed.data.budgetMaxAmount,
      currency_code: parsed.data.currencyCode,
      desired_due_at: parsed.data.desiredDueAt
    })
    .select('id')
    .single();
  if (error) return {ok: false, error: 'quote_submission_failed'};
  return {ok: true, id: data.id};
}

export async function recordRecentView(input: unknown): Promise<void> {
  const parsed = recordRecentViewSchema.safeParse(input);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {data: auth} = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('recently_viewed_products').upsert(
    {
      profile_id: auth.user.id,
      product_id: parsed.data.productId,
      viewed_at: new Date().toISOString()
    },
    {onConflict: 'profile_id,product_id'}
  );
}

const catalogProductMutationSchema = z.object({
  locale: z.string().min(2).max(10),
  productId: z.string().uuid()
});

export async function archiveProduct(input: unknown): Promise<CatalogActionResult> {
  const parsed = catalogProductMutationSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: 'invalid_product'};
  await requirePermission(parsed.data.locale, 'catalog.manage');
  const supabase = await createClient();
  const {error} = await supabase
    .from('products')
    .update({status: 'archived', deleted_at: new Date().toISOString()})
    .eq('id', parsed.data.productId);
  if (error) return {ok: false, error: 'archive_failed'};
  revalidatePath(`/${parsed.data.locale}/admin/catalog`);
  revalidatePath(`/${parsed.data.locale}/products`);
  return {ok: true};
}
