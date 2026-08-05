'use client';

import {Languages} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useTransition} from 'react';

import {Button} from '@/components/ui/button';
import {Dropdown, DropdownContent, DropdownItem, DropdownTrigger} from '@/components/ui/overlays';
import {usePathname, useRouter} from '@/i18n/navigation';
import {routing, type AppLocale} from '@/i18n/routing';
import {usePreferenceOptions} from '../hooks/use-preference-options';

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Controls');
  const [isPending, startTransition] = useTransition();
  const {data} = usePreferenceOptions();
  const changeLocale = (nextLocale: AppLocale) =>
    startTransition(() => router.replace(pathname, {locale: nextLocale}));
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={t('language')} disabled={isPending}>
          <Languages aria-hidden="true" />
          <span>{locale.toUpperCase()}</span>
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end">
        {data.locales.map((item) => {
          const supported = routing.locales.find((candidate) => candidate === item.code);
          if (!supported) return null;
          return (
            <DropdownItem key={item.code} onSelect={() => changeLocale(supported as AppLocale)}>
              <span className="ui-locale-code">{item.code.toUpperCase()}</span>
              {item.code === 'ar'
                ? t('arabic')
                : item.code === 'en'
                  ? t('english')
                  : item.nativeName}
              {locale === item.code ? <span className="ui-menu-check">✓</span> : null}
            </DropdownItem>
          );
        })}
      </DropdownContent>
    </Dropdown>
  );
}

export const LanguageSwitcher = LocaleSwitcher;
