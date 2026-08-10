import {ImageResponse} from 'next/og';

import {getProductBySlug} from '@/features/catalog/server/queries';
import {translate} from '@/features/catalog/types';
import type {AppLocale} from '@/i18n/routing';

export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default async function ProductOpenGraphImage({
  params
}: {
  params: Promise<{locale: AppLocale; slug: string}>;
}) {
  const {locale, slug} = await params;
  const product = await getProductBySlug(slug);
  const title = product ? translate(product.name, locale) : 'Nexora';
  const description = product ? translate(product.shortDescription, locale) : '';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        color: 'white',
        background:
          'radial-gradient(circle at 85% 10%, rgb(122, 92, 255), transparent 34%), linear-gradient(135deg, rgb(8, 8, 14), rgb(20, 16, 38))',
        fontFamily: 'sans-serif'
      }}
    >
      <div
        style={{display: 'flex', alignItems: 'center', gap: '20px', fontSize: 28, fontWeight: 700}}
      >
        <span
          style={{
            display: 'flex',
            width: 56,
            height: 56,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgb(139, 92, 246), rgb(34, 211, 238))'
          }}
        >
          N
        </span>
        NEXORA
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px'}}>
        <span style={{fontSize: 24, color: 'rgb(151, 125, 255)'}}>
          {product?.productTypeCode.toUpperCase()}
        </span>
        <div style={{fontSize: 72, lineHeight: 1.05, fontWeight: 700}}>{title}</div>
        <div style={{fontSize: 30, lineHeight: 1.35, color: 'rgb(194, 194, 210)'}}>
          {description}
        </div>
      </div>
    </div>,
    size
  );
}
