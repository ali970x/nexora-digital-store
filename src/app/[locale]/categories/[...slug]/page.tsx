import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
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
import {translate} from '@/features/catalog/types';
import type {AppLocale} from '@/i18n/routing';

type Props = {
  params: Promise<{locale: AppLocale; slug: string[]}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({params}: Pick<Props, 'params'>): Promise<Metadata> {
  const {locale, slug} = await params;
  const category = (await getCategories()).find((item) => item.slug === slug.at(-1));
  const fallback = await getTranslations({locale, namespace: 'Catalog'});
  const title = category ? translate(category.name, locale) : fallback('title');
  const description = category
    ? translate(category.description, locale)
    : fallback('metaDescription');
  const path = slug.join('/');
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/categories/${path}`,
      languages: {
        en: `/en/categories/${path}`,
        ar: `/ar/categories/${path}`,
        'x-default': `/en/categories/${path}`
      }
    },
    openGraph: {title, description, url: `/${locale}/categories/${path}`}
  };
}

export default async function CategoryPage({params, searchParams}: Props) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug.at(-1));
  if (!category) notFound();

  const raw = await searchParams;
  const single = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  const filters = catalogSearchSchema.parse(single);
  const [result, productTypes, regions, t] = await Promise.all([
    searchCatalog(locale, {
      query: filters.q,
      category: category.slug,
      productType: filters.type,
      region: filters.region,
      minPrice: filters.min,
      maxPrice: filters.max,
      sort: filters.sort,
      page: filters.page
    }),
    getProductTypes(),
    getRegions(),
    getTranslations({locale, namespace: 'Catalog'})
  ]);
  const labels = {
    title: translate(category.name, locale),
    description: translate(category.description, locale),
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
          category: category.slug,
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
