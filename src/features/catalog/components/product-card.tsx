import {ArrowUpRight, Clock3, PackageCheck} from 'lucide-react';
import Image from 'next/image';

import {PriceDisplay} from '@/components/ui/advanced';
import {Badge, Card} from '@/components/ui/surfaces';
import {Link} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';
import type {CurrencyCode} from '@/lib/money';
import type {CatalogCardProduct} from '../types';
import {translate} from '../types';

export function ProductCard({
  product,
  locale,
  labels
}: {
  product: CatalogCardProduct;
  locale: AppLocale;
  labels: {view: string; comingSoon: string; outOfStock: string; instant: string};
}) {
  const statusLabel =
    product.status === 'coming_soon'
      ? labels.comingSoon
      : product.status === 'out_of_stock'
        ? labels.outOfStock
        : null;
  const badge = product.badges[0] ? translate(product.badges[0], locale) : null;
  return (
    <Card className="catalog-card" interactive>
      <Link href={`/products/${product.slug}`} locale={locale} className="catalog-card-link">
        <div className="catalog-card-media">
          <Image
            src={product.primaryMediaUrl ?? '/icons/icon-512.png'}
            alt={translate(product.name, locale)}
            fill
            sizes="(max-width: 40rem) 90vw, (max-width: 70rem) 45vw, 22vw"
            unoptimized={Boolean(product.primaryMediaUrl?.startsWith('http'))}
          />
          <div className="catalog-card-badges">
            {badge ? <Badge tone="accent">{badge}</Badge> : null}
            {statusLabel ? <Badge tone="warning">{statusLabel}</Badge> : null}
          </div>
        </div>
        <div className="catalog-card-body">
          <h2>{translate(product.name, locale)}</h2>
          <p>{translate(product.shortDescription, locale)}</p>
          <div className="catalog-card-meta">
            <span>
              {product.status === 'active' ? (
                <PackageCheck aria-hidden="true" />
              ) : (
                <Clock3 aria-hidden="true" />
              )}
              {product.status === 'active' ? labels.instant : statusLabel}
            </span>
            <PriceDisplay
              amount={product.priceAmount}
              currency={product.currencyCode as CurrencyCode}
              size="sm"
            />
          </div>
          <span className="catalog-card-action">
            {labels.view}
            <ArrowUpRight aria-hidden="true" className="rtl:-scale-x-100" />
          </span>
        </div>
      </Link>
    </Card>
  );
}
