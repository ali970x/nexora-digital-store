import {useTranslations} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';

import {StorefrontShell} from '@/components/layout/storefront-shell';
import {MarketingHome} from '@/features/storefront/components/marketing-home';

type HomePageProps = {params: Promise<{locale: string}>};

export default async function HomePage({params}: HomePageProps) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations('A11y');
  return (
    <>
      <a className="skip-link" href="#main">
        {t('skip')}
      </a>
      <StorefrontShell>
        <MarketingHome />
      </StorefrontShell>
    </>
  );
}
