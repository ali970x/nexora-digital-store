'use client';

import {Laptop, Moon, Sun} from 'lucide-react';
import {useTheme} from 'next-themes';
import {useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

import {Button} from '@/components/ui/button';
import {Dropdown, DropdownContent, DropdownItem, DropdownTrigger} from '@/components/ui/overlays';

const themes = [
  {value: 'dark', icon: Moon, label: 'dark'},
  {value: 'light', icon: Sun, label: 'light'},
  {value: 'system', icon: Laptop, label: 'system'}
] as const;

export function ThemeSwitcher() {
  const {theme, resolvedTheme, setTheme} = useTheme();
  const t = useTranslations('Controls');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ActiveIcon = !mounted || resolvedTheme === 'dark' ? Moon : Sun;
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={t('theme')}>
          <ActiveIcon aria-hidden="true" />
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end">
        {themes.map(({value, icon: Icon, label}) => (
          <DropdownItem key={value} onSelect={() => setTheme(value)}>
            <Icon aria-hidden="true" />
            {t(label)}
            {theme === value ? <span className="ui-menu-check">✓</span> : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
