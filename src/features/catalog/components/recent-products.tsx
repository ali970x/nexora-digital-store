'use client';

import {useEffect, useState} from 'react';

import type {AppLocale} from '@/i18n/routing';
import type {CatalogCardProduct} from '../types';
import {ProductCard} from './product-card';

export function RecentProducts({
  products,
  currentSlug,
  locale,
  title,
  labels
}: {
  products: CatalogCardProduct[];
  currentSlug: string;
  locale: AppLocale;
  title: string;
  labels: {view: string; comingSoon: string; outOfStock: string; instant: string};
}) {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const stored = JSON.parse(
      window.localStorage.getItem('nexora-recent-products') ?? '[]'
    ) as unknown;
    setSlugs(
      Array.isArray(stored)
        ? stored.filter((value): value is string => typeof value === 'string')
        : []
    );
  }, []);
  const recent = slugs
    .filter((slug) => slug !== currentSlug)
    .flatMap((slug) => products.find((product) => product.slug === slug) ?? [])
    .slice(0, 4);
  if (!recent.length) return null;
  return (
    <section className="related-products">
      <span className="section-eyebrow">{title}</span>
      <div className="catalog-grid">
        {recent.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} labels={labels} />
        ))}
      </div>
    </section>
  );
}
