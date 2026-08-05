'use client';

import {useEffect} from 'react';
import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  const t = useTranslations('ErrorPage');
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="site-container grid min-h-svh place-items-center py-16 text-center">
      <div className="ui-card max-w-lg p-8">
        <p className="section-eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-3 text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-3">{t('description')}</p>
        <Button variant="gradient" className="mt-6" onClick={reset}>
          {t('retry')}
        </Button>
      </div>
    </main>
  );
}
