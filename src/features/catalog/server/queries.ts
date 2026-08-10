import {cache} from 'react';

import {createClient} from '@/lib/supabase/server';
import type {Json} from '@/lib/supabase/database.types';
import {catalogInputSchemaDefinition} from '../schemas/product-input';
import type {
  CatalogCardProduct,
  CatalogInputField,
  CatalogProduct,
  LocalizedText,
  ServiceConfig
} from '../types';
import {asLocalizedList, asLocalizedText} from '../types';

export type CatalogFilters = {
  query?: string;
  category?: string;
  productType?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  pageSize?: number;
};

export type CategoryItem = {
  id: string;
  parentId: string | null;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  iconName: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

function parseFields(value: Json): CatalogInputField[] {
  const result = catalogInputSchemaDefinition.safeParse(value);
  return result.success ? result.data : [];
}

function mediaUrl(url: string | null, storagePath: string | null, publicUrl: string): string {
  if (url) return url;
  return storagePath
    ? `${publicUrl}/storage/v1/object/public/catalog-media/${storagePath}`
    : '/icons/icon-512.png';
}

export async function searchCatalog(locale: string, filters: CatalogFilters = {}) {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 60);
  const page = Math.max(filters.page ?? 1, 1);
  const supabase = await createClient();
  const {data, error} = await supabase.rpc('search_catalog', {
    p_locale: locale,
    p_query: filters.query ?? null,
    p_category_slug: filters.category ?? null,
    p_product_type: filters.productType ?? null,
    p_region: filters.region ?? null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_sort: filters.sort ?? 'relevance',
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize
  });
  if (error) throw new Error(`catalog_search_failed:${error.code}`);
  const products: CatalogCardProduct[] = (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: asLocalizedText(row.name),
    shortDescription: asLocalizedText(row.short_description),
    badges: asLocalizedList(row.badges),
    status: row.status,
    productTypeCode: row.product_type_code,
    categorySlug: row.category_slug,
    priceAmount: Number(row.price_amount),
    currencyCode: row.currency_code,
    primaryMediaUrl: row.primary_media_url
  }));
  return {products, total: Number(data?.[0]?.total_count ?? 0), page, pageSize};
}

export async function getAdminCatalog(): Promise<CatalogCardProduct[]> {
  const supabase = await createClient();
  const {data: products, error} = await supabase
    .from('products')
    .select('id,slug,name,short_description,badges,status,product_type_code,category_id')
    .order('created_at', {ascending: false});
  if (error) throw new Error(`admin_catalog_failed:${error.code}`);
  const ids = (products ?? []).map((product) => product.id);
  if (!ids.length) return [];
  const [categoryResult, variantResult, mediaResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id,slug')
      .in('id', [...new Set((products ?? []).map((product) => product.category_id))]),
    supabase
      .from('product_variants')
      .select('product_id,price_amount,currency_code,sort_order')
      .in('product_id', ids)
      .eq('active', true)
      .order('price_amount'),
    supabase
      .from('product_media')
      .select('product_id,url,sort_order')
      .in('product_id', ids)
      .order('sort_order')
  ]);
  if (categoryResult.error || variantResult.error || mediaResult.error) {
    throw new Error('admin_catalog_relations_failed');
  }
  const categorySlugs = new Map(categoryResult.data.map((row) => [row.id, row.slug]));
  return (products ?? []).map((product) => {
    const variant = variantResult.data.find((row) => row.product_id === product.id);
    const media = mediaResult.data.find((row) => row.product_id === product.id);
    return {
      id: product.id,
      slug: product.slug,
      name: asLocalizedText(product.name),
      shortDescription: asLocalizedText(product.short_description),
      badges: asLocalizedList(product.badges),
      status: product.status,
      productTypeCode: product.product_type_code,
      categorySlug: categorySlugs.get(product.category_id) ?? '',
      priceAmount: Number(variant?.price_amount ?? 0),
      currencyCode: variant?.currency_code ?? 'USD',
      primaryMediaUrl: media?.url ?? null
    };
  });
}

export const getCategories = cache(async (): Promise<CategoryItem[]> => {
  const supabase = await createClient();
  const {data, error} = await supabase
    .from('categories')
    .select('id,parent_id,slug,name,description,icon_name,image_url,sort_order')
    .order('sort_order');
  if (error) throw new Error(`catalog_categories_failed:${error.code}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    slug: row.slug,
    name: asLocalizedText(row.name),
    description: asLocalizedText(row.description),
    iconName: row.icon_name,
    imageUrl: row.image_url,
    sortOrder: row.sort_order
  }));
});

export const getProductTypes = cache(async () => {
  const supabase = await createClient();
  const {data, error} = await supabase
    .from('product_types')
    .select('code,name,description,icon_name,capabilities')
    .eq('enabled', true)
    .order('sort_order');
  if (error) throw new Error(`catalog_types_failed:${error.code}`);
  return (data ?? []).map((row) => ({
    code: row.code,
    name: asLocalizedText(row.name),
    description: asLocalizedText(row.description),
    iconName: row.icon_name,
    capabilities: row.capabilities
  }));
});

export const getRegions = cache(async () => {
  const supabase = await createClient();
  const {data, error} = await supabase
    .from('product_variants')
    .select('region_code')
    .not('region_code', 'is', null)
    .eq('active', true);
  if (error) throw new Error(`catalog_regions_failed:${error.code}`);
  return [
    ...new Set((data ?? []).flatMap((row) => (row.region_code ? [row.region_code] : [])))
  ].sort();
});

export const getProductBySlug = cache(async (slug: string): Promise<CatalogProduct | null> => {
  const supabase = await createClient();
  const {data: product, error} = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`catalog_product_failed:${error.code}`);
  if (!product) return null;

  const [categoryResult, variantsResult, mediaResult, serviceResult] = await Promise.all([
    supabase.from('categories').select('slug,name').eq('id', product.category_id).single(),
    supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('active', true)
      .order('sort_order'),
    supabase.from('product_media').select('*').eq('product_id', product.id).order('sort_order'),
    supabase.from('service_product_configs').select('*').eq('product_id', product.id).maybeSingle()
  ]);
  if (categoryResult.error || variantsResult.error || mediaResult.error || serviceResult.error) {
    throw new Error('catalog_product_relations_failed');
  }
  const variants = variantsResult.data ?? [];
  const variantIds = variants.map((variant) => variant.id);
  const {data: smmRows, error: smmError} = variantIds.length
    ? await supabase.from('smm_product_configs').select('*').in('variant_id', variantIds)
    : {data: [], error: null};
  if (smmError) throw new Error(`catalog_smm_config_failed:${smmError.code}`);
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceConfig: ServiceConfig | null = serviceResult.data
    ? {
        requirementSchema: parseFields(serviceResult.data.requirement_schema),
        milestoneTemplates: parseMilestones(serviceResult.data.milestone_templates),
        includedRevisions: serviceResult.data.included_revisions,
        customQuoteRequired: serviceResult.data.custom_quote_required
      }
    : null;

  return {
    id: product.id,
    slug: product.slug,
    categoryId: product.category_id,
    categorySlug: categoryResult.data.slug,
    categoryName: asLocalizedText(categoryResult.data.name),
    productTypeCode: product.product_type_code,
    name: asLocalizedText(product.name),
    shortDescription: asLocalizedText(product.short_description),
    description: asLocalizedText(product.description),
    badges: asLocalizedList(product.badges),
    status: product.status,
    fulfillmentMode: product.fulfillment_mode,
    warrantyText: asLocalizedText(product.warranty_text),
    deliveryEstimate: asLocalizedText(product.delivery_estimate),
    inputSchema: parseFields(product.input_schema),
    seo: toJsonObject(product.seo),
    featured: product.featured,
    publishedAt: product.published_at,
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: asLocalizedText(variant.name),
      priceAmount: Number(variant.price_amount),
      currencyCode: variant.currency_code,
      stockQuantity: variant.stock_quantity,
      unlimitedStock: variant.unlimited_stock,
      regionCode: variant.region_code,
      durationDays: variant.duration_days,
      denominationAmount: variant.denomination_amount ? Number(variant.denomination_amount) : null,
      denominationCurrencyCode: variant.denomination_currency_code,
      accountType: variant.account_type,
      attributes: variant.attributes
    })),
    media: (mediaResult.data ?? []).map((item) => ({
      id: item.id,
      kind: item.kind,
      url: mediaUrl(item.url, item.storage_path, publicUrl),
      alt: asLocalizedText(item.alt_text),
      blurDataUrl: item.blur_data_url,
      isPrimary: item.is_primary
    })),
    smmConfigs: (smmRows ?? []).map((config) => ({
      variantId: config.variant_id,
      minQuantity: config.min_quantity,
      maxQuantity: config.max_quantity,
      quantityStep: config.quantity_step,
      pricePer1000Amount: Number(config.price_per_1000_amount),
      currencyCode: config.currency_code,
      dripFeedEnabled: config.drip_feed_enabled,
      maxDripRuns: config.max_drip_runs,
      minDripIntervalMinutes: config.min_drip_interval_minutes
    })),
    serviceConfig
  };
});

export async function getRelatedProducts(productId: string, locale: string) {
  const supabase = await createClient();
  const {data, error} = await supabase
    .from('product_relations')
    .select('related_product_id')
    .eq('product_id', productId)
    .order('score', {ascending: false})
    .limit(4);
  if (error || !data?.length) return [];
  const ids = new Set(data.map((row) => row.related_product_id));
  const result = await searchCatalog(locale, {pageSize: 60});
  return result.products.filter((product) => ids.has(product.id)).slice(0, 4);
}

function parseMilestones(value: Json): Array<{title: LocalizedText; percentage: number}> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') return [];
    const title = asLocalizedText(item.title ?? null);
    const percentage = typeof item.percentage === 'number' ? item.percentage : 0;
    return Object.keys(title).length && percentage > 0 ? [{title, percentage}] : [];
  });
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
}
