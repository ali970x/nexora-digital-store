import {LockKeyhole} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import type {ReactNode} from 'react';

import {Brand} from '@/components/brand';
import {LocaleSwitcher} from '@/features/preferences/components/language-switcher';
import {ThemeSwitcher} from '@/features/preferences/components/theme-switcher';
import {Link} from '@/i18n/navigation';

export default async function AuthLayout({children}: {children: ReactNode}) {
  const t = await getTranslations('Auth');
  return (
    <main className="auth-shell">
      <div className="auth-aurora" aria-hidden="true" />
      <header className="auth-header">
        <Link href="/" aria-label={t('home')}>
          <Brand />
        </Link>
        <div>
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      <div className="auth-layout">
        <aside className="auth-story">
          <span className="auth-story-badge">
            <LockKeyhole aria-hidden="true" />
            {t('protected')}
          </span>
          <h2>{t('storyTitle')}</h2>
          <p>{t('storyDescription')}</p>
          <ul>
            <li>{t('storyPoint1')}</li>
            <li>{t('storyPoint2')}</li>
            <li>{t('storyPoint3')}</li>
          </ul>
        </aside>
        {children}
      </div>
    </main>
  );
}
