import {FolderTree, PackageCheck, PackageX, ScrollText} from 'lucide-react';
import {getTranslations, setRequestLocale} from 'next-intl/server';

import {StatCard} from '@/components/ui/advanced';
import {AdminCatalogTable} from '@/features/catalog/components/admin-catalog-table';
import {getAdminCatalog, getCategories} from '@/features/catalog/server/queries';
import {requirePermission} from '@/features/auth/server/authorization';
import type {AppLocale} from '@/i18n/routing';

export default async function AdminCatalogPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'catalog.manage');
  const [products, categories, t] = await Promise.all([
    getAdminCatalog(),
    getCategories(),
    getTranslations({locale, namespace: 'Catalog.admin'})
  ]);
  const active = products.filter((product) => product.status === 'active').length;
  const outOfStock = products.filter((product) => product.status === 'out_of_stock').length;
  return (
    <main className="account-page admin-catalog-page">
      <header className="account-page-heading">
        <div>
          <span className="section-eyebrow">{t('eyebrow')}</span>
          <h1>{t('title')}</h1>
          <p>{t('description')}</p>
        </div>
      </header>
      <section className="admin-catalog-stats">
        <StatCard
          label={t('products')}
          value={String(products.length)}
          icon={<PackageCheck aria-hidden="true" />}
        />
        <StatCard
          label={t('categories')}
          value={String(categories.length)}
          icon={<FolderTree aria-hidden="true" />}
        />
        <StatCard
          label={t('active')}
          value={String(active)}
          icon={<ScrollText aria-hidden="true" />}
        />
        <StatCard
          label={t('outOfStock')}
          value={String(outOfStock)}
          icon={<PackageX aria-hidden="true" />}
        />
      </section>
      <AdminCatalogTable products={products} />
    </main>
  );
}
