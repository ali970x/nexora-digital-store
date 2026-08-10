import type {Metadata} from 'next';
import {getTranslations, setRequestLocale} from 'next-intl/server';

import {StorefrontShell} from '@/components/layout/storefront-shell';
import {CatalogBrowser} from '@/features/catalog/components/catalog-browser';
import {catalogSearchSchema} from '@/features/catalog/schemas/catalog';
import {
  getCategories,
  getProductTypes,
  getRegions,
  searchCatalog
} from '@/features/catalog/server/queries';
import type {AppLocale} from '@/i18n/routing';

type Props = {
  params: Promise<{locale: AppLocale}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({params}: Pick<Props, 'params'>): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Catalog'});
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/products`,
      languages: {en: '/en/products', ar: '/ar/products', 'x-default': '/en/products'}
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: `/${locale}/products`,
      images: [`/${locale}/opengraph-image`]
    }
  };
}

export default async function ProductsPage({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const single = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  const filters = catalogSearchSchema.parse(single);
  const [result, categories, productTypes, regions, t] = await Promise.all([
    searchCatalog(locale, {
      query: filters.q,
      category: filters.category,
      productType: filters.type,
      region: filters.region,
      minPrice: filters.min,
      maxPrice: filters.max,
      sort: filters.sort,
      page: filters.page
    }),
    getCategories(),
    getProductTypes(),
    getRegions(),
    getTranslations({locale, namespace: 'Catalog'})
  ]);
  const labels = {
    title: t('title'),
    description: t('description'),
    searchPlaceholder: t('searchPlaceholder'),
    search: t('search'),
    filters: t('filters'),
    category: t('category'),
    allCategories: t('allCategories'),
    type: t('type'),
    allTypes: t('allTypes'),
    region: t('region'),
    allRegions: t('allRegions'),
    minPrice: t('minPrice'),
    maxPrice: t('maxPrice'),
    sort: t('sort'),
    relevance: t('relevance'),
    newest: t('newest'),
    priceLow: t('priceLow'),
    priceHigh: t('priceHigh'),
    results: t.raw('results') as string,
    clear: t('clear'),
    emptyTitle: t('emptyTitle'),
    emptyDescription: t('emptyDescription'),
    previous: t('previous'),
    next: t('next'),
    page: t.raw('page') as string,
    view: t('view'),
    comingSoon: t('comingSoon'),
    outOfStock: t('outOfStock'),
    instant: t('instant')
  };
  return (
    <StorefrontShell>
      <CatalogBrowser
        locale={locale}
        labels={labels}
        products={result.products}
        categories={categories}
        productTypes={productTypes}
        regions={regions}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        values={{
          q: filters.q,
          category: filters.category,
          type: filters.type,
          region: filters.region,
          min: filters.min?.toString(),
          max: filters.max?.toString(),
          sort: filters.sort
        }}
      />
    </StorefrontShell>
  );
}
