import {Filter, Search, SlidersHorizontal} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {EmptyState} from '@/components/ui/surfaces';
import {Link} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';
import type {CatalogCardProduct} from '../types';
import {translate} from '../types';
import type {CategoryItem} from '../server/queries';
import {ProductCard} from './product-card';

type Labels = {
  title: string;
  description: string;
  searchPlaceholder: string;
  search: string;
  filters: string;
  category: string;
  allCategories: string;
  type: string;
  allTypes: string;
  region: string;
  allRegions: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  relevance: string;
  newest: string;
  priceLow: string;
  priceHigh: string;
  results: string;
  clear: string;
  emptyTitle: string;
  emptyDescription: string;
  previous: string;
  next: string;
  page: string;
  view: string;
  comingSoon: string;
  outOfStock: string;
  instant: string;
};

export function CatalogBrowser({
  locale,
  labels,
  products,
  categories,
  productTypes,
  regions,
  total,
  page,
  pageSize,
  values
}: {
  locale: AppLocale;
  labels: Labels;
  products: CatalogCardProduct[];
  categories: CategoryItem[];
  productTypes: Array<{code: string; name: Record<string, string>}>;
  regions: string[];
  total: number;
  page: number;
  pageSize: number;
  values: Record<string, string | undefined>;
}) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams(
      Object.entries({...values, page: String(nextPage)}).filter(
        (entry): entry is [string, string] => Boolean(entry[1])
      )
    );
    return `/products?${query.toString()}`;
  };

  return (
    <main id="main-content" className="catalog-page page-shell">
      <section className="catalog-hero">
        <div>
          <span className="section-eyebrow">
            {labels.results.replace('{count}', String(total))}
          </span>
          <h1>{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
        <form className="catalog-search" method="get" action={`/${locale}/products`}>
          <Search aria-hidden="true" />
          <input
            name="q"
            defaultValue={values.q}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
          />
          <Button type="submit" variant="gradient">
            {labels.search}
          </Button>
        </form>
      </section>

      <div className="catalog-layout">
        <aside className="catalog-filters">
          <div className="catalog-filter-title">
            <SlidersHorizontal aria-hidden="true" />
            <h2>{labels.filters}</h2>
          </div>
          <form method="get" action={`/${locale}/products`}>
            <input type="hidden" name="q" value={values.q ?? ''} />
            <label>
              {labels.category}
              <select name="category" defaultValue={values.category ?? ''}>
                <option value="">{labels.allCategories}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {translate(category.name, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {labels.type}
              <select name="type" defaultValue={values.type ?? ''}>
                <option value="">{labels.allTypes}</option>
                {productTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {translate(type.name, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {labels.region}
              <select name="region" defaultValue={values.region ?? ''}>
                <option value="">{labels.allRegions}</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <div className="catalog-price-range">
              <label>
                {labels.minPrice}
                <input name="min" type="number" min="0" defaultValue={values.min} />
              </label>
              <label>
                {labels.maxPrice}
                <input name="max" type="number" min="0" defaultValue={values.max} />
              </label>
            </div>
            <label>
              {labels.sort}
              <select name="sort" defaultValue={values.sort ?? 'relevance'}>
                <option value="relevance">{labels.relevance}</option>
                <option value="newest">{labels.newest}</option>
                <option value="price_asc">{labels.priceLow}</option>
                <option value="price_desc">{labels.priceHigh}</option>
              </select>
            </label>
            <Button type="submit" variant="gradient">
              <Filter aria-hidden="true" />
              {labels.search}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/products" locale={locale}>
                {labels.clear}
              </Link>
            </Button>
          </form>
        </aside>
        <section className="catalog-results" aria-live="polite">
          {products.length ? (
            <div className="catalog-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} labels={labels} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={labels.emptyTitle}
              description={labels.emptyDescription}
              action={
                <Button asChild variant="gradient">
                  <Link href="/products" locale={locale}>
                    {labels.clear}
                  </Link>
                </Button>
              }
            />
          )}
          {products.length ? (
            <nav className="catalog-pagination" aria-label={labels.page}>
              <Button asChild variant="outline" disabled={page <= 1}>
                <Link href={pageHref(Math.max(1, page - 1))} locale={locale}>
                  {labels.previous}
                </Link>
              </Button>
              <span>
                {labels.page.replace('{page}', String(page)).replace('{pages}', String(pages))}
              </span>
              <Button asChild variant="outline" disabled={page >= pages}>
                <Link href={pageHref(Math.min(pages, page + 1))} locale={locale}>
                  {labels.next}
                </Link>
              </Button>
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  );
}
