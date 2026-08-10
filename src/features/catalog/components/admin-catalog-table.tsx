'use client';

import {ExternalLink} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';

import {PriceDisplay} from '@/components/ui/advanced';
import {Badge, DataTable, type TableColumn} from '@/components/ui/surfaces';
import {Link} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';
import type {CurrencyCode} from '@/lib/money';
import type {CatalogCardProduct} from '../types';
import {translate} from '../types';

export function AdminCatalogTable({products}: {products: CatalogCardProduct[]}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('Catalog.admin');
  const columns: TableColumn<CatalogCardProduct>[] = [
    {key: 'name', label: t('name'), value: (row) => translate(row.name, locale), sortable: true},
    {key: 'type', label: t('type'), value: (row) => row.productTypeCode, sortable: true},
    {
      key: 'status',
      label: t('status'),
      value: (row) => row.status,
      sortable: true,
      render: (row) => (
        <Badge
          tone={
            row.status === 'active' ? 'success' : row.status === 'draft' ? 'neutral' : 'warning'
          }
        >
          {t(`statusValues.${row.status}`)}
        </Badge>
      )
    },
    {
      key: 'price',
      label: t('price'),
      value: (row) => row.priceAmount,
      sortable: true,
      align: 'end',
      render: (row) => (
        <PriceDisplay
          amount={row.priceAmount}
          currency={row.currencyCode as CurrencyCode}
          size="sm"
        />
      )
    },
    {
      key: 'open',
      label: t('open'),
      value: () => '',
      align: 'end',
      render: (row) => (
        <Link
          href={`/products/${row.slug}`}
          locale={locale}
          aria-label={`${t('open')}: ${translate(row.name, locale)}`}
        >
          <ExternalLink aria-hidden="true" />
        </Link>
      )
    }
  ];
  return <DataTable rows={products} columns={columns} />;
}
