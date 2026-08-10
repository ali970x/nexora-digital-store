import type {MetadataRoute} from 'next';

import {getCategories, searchCatalog} from '@/features/catalog/server/queries';
import {routing} from '@/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const [categories, catalog] = await Promise.all([
    getCategories(),
    searchCatalog('en', {pageSize: 60})
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryPath = (categoryId: string) => {
    const slugs: string[] = [];
    let current = categoryById.get(categoryId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      slugs.unshift(current.slug);
      current = current.parentId ? categoryById.get(current.parentId) : undefined;
    }
    return slugs.join('/');
  };
  return routing.locales.flatMap((locale) => {
    const alternates = (path: string) => ({
      languages: Object.fromEntries(routing.locales.map((code) => [code, `${base}/${code}${path}`]))
    });
    return [
      {
        url: `${base}/${locale}`,
        changeFrequency: 'daily' as const,
        priority: 1,
        alternates: alternates('')
      },
      {
        url: `${base}/${locale}/products`,
        changeFrequency: 'hourly' as const,
        priority: 0.9,
        alternates: alternates('/products')
      },
      ...categories.map((category) => ({
        url: `${base}/${locale}/categories/${categoryPath(category.id)}`,
        changeFrequency: 'daily' as const,
        priority: 0.75,
        alternates: alternates(`/categories/${categoryPath(category.id)}`)
      })),
      ...catalog.products.map((product) => ({
        url: `${base}/${locale}/products/${product.slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
        alternates: alternates(`/products/${product.slug}`)
      }))
    ];
  });
}
