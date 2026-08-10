import type {FulfillmentMode, Json, ProductStatus} from '@/lib/supabase/database.types';

export type LocalizedText = Record<string, string>;

export type CatalogFieldType =
  'player_id' | 'email' | 'profile_url' | 'quantity' | 'notes' | 'file_upload';

export type CatalogInputField = {
  key: string;
  type: CatalogFieldType;
  label: LocalizedText;
  help?: LocalizedText;
  placeholder?: LocalizedText;
  required?: boolean;
  regex?: string;
  min?: number;
  max?: number;
  step?: number;
  acceptedTypes?: string[];
};

export type ProductVariant = {
  id: string;
  sku: string;
  name: LocalizedText;
  priceAmount: number;
  currencyCode: string;
  stockQuantity: number;
  unlimitedStock: boolean;
  regionCode: string | null;
  durationDays: number | null;
  denominationAmount: number | null;
  denominationCurrencyCode: string | null;
  accountType: string | null;
  attributes: Json;
};

export type ProductMedia = {
  id: string;
  kind: 'image' | 'video' | 'logo';
  url: string;
  alt: LocalizedText;
  blurDataUrl: string | null;
  isPrimary: boolean;
};

export type SmmConfig = {
  variantId: string;
  minQuantity: number;
  maxQuantity: number;
  quantityStep: number;
  pricePer1000Amount: number;
  currencyCode: string;
  dripFeedEnabled: boolean;
  maxDripRuns: number | null;
  minDripIntervalMinutes: number | null;
};

export type ServiceConfig = {
  requirementSchema: CatalogInputField[];
  milestoneTemplates: Array<{title: LocalizedText; percentage: number}>;
  includedRevisions: number;
  customQuoteRequired: boolean;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categoryName: LocalizedText;
  productTypeCode: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  badges: LocalizedText[];
  status: ProductStatus;
  fulfillmentMode: FulfillmentMode;
  warrantyText: LocalizedText;
  deliveryEstimate: LocalizedText;
  inputSchema: CatalogInputField[];
  seo: Record<string, Json | undefined>;
  featured: boolean;
  publishedAt: string | null;
  variants: ProductVariant[];
  media: ProductMedia[];
  smmConfigs: SmmConfig[];
  serviceConfig: ServiceConfig | null;
};

export type CatalogCardProduct = {
  id: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  badges: LocalizedText[];
  status: ProductStatus;
  productTypeCode: string;
  categorySlug: string;
  priceAmount: number;
  currencyCode: string;
  primaryMediaUrl: string | null;
};

export function asLocalizedText(value: Json): LocalizedText {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
}

export function asLocalizedList(value: Json): LocalizedText[] {
  return Array.isArray(value)
    ? value.map(asLocalizedText).filter((item) => Object.keys(item).length)
    : [];
}

export function translate(value: LocalizedText, locale: string, fallback = 'en'): string {
  return value[locale] ?? value[fallback] ?? Object.values(value)[0] ?? '';
}
