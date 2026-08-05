import {ImageResponse} from 'next/og';

import {brandImageTokens as color} from '@/lib/brand';

export const alt = 'Nexora — everything digital in one trusted wallet';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default async function OpenGraphImage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const arabic = locale === 'ar';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '70px 76px',
        background: color.canvas,
        color: color.text,
        direction: arabic ? 'rtl' : 'ltr'
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: 520,
          top: -230,
          right: -60,
          background: color.violet,
          opacity: 0.26,
          filter: 'blur(70px)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 440,
          height: 440,
          borderRadius: 440,
          bottom: -260,
          left: 180,
          background: color.cyan,
          opacity: 0.2,
          filter: 'blur(74px)'
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 25,
          fontWeight: 800,
          letterSpacing: '0.16em'
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${color.violet}, ${color.cyan})`,
            boxShadow: `0 16px 50px ${color.violet}`
          }}
        >
          N
        </div>
        NEXORA
      </div>
      <div style={{display: 'flex', flexDirection: 'column', maxWidth: 980, gap: 22}}>
        <div
          style={{
            fontSize: arabic ? 69 : 76,
            lineHeight: 1.03,
            letterSpacing: arabic ? '-0.02em' : '-0.055em',
            fontWeight: 750
          }}
        >
          {arabic
            ? 'كل ما هو رقمي. محفظة واحدة موثوقة.'
            : 'Everything digital. One trusted wallet.'}
        </div>
        <div style={{fontSize: 27, lineHeight: 1.5, color: color.muted}}>
          {arabic
            ? 'شحن، اشتراكات، بطاقات وخدمات رقمية — فوراً.'
            : 'Top-ups, subscriptions, gift cards and digital services — delivered.'}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 20,
          color: color.muted
        }}
      >
        <span>nexora.store</span>
        <span style={{color: color.cyan}}>Lebanon · MENA · Global</span>
      </div>
    </div>,
    size
  );
}
