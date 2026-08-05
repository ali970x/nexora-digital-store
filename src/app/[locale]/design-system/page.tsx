import {setRequestLocale} from 'next-intl/server';

import {DesignSystemPage} from '@/features/design-system/components/design-system-page';

export default async function DesignSystemRoute({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <DesignSystemPage />;
}
