'use client';

import {Banknote} from 'lucide-react';
import {useTranslations} from 'next-intl';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/form-controls';
import {usePreferenceOptions} from '../hooks/use-preference-options';
import {useCurrencyStore} from '../stores/currency-store';

export function CurrencySwitcher({compact}: {compact?: boolean}) {
  const currency = useCurrencyStore((state) => state.currency);
  const setCurrency = useCurrencyStore((state) => state.setCurrency);
  const t = useTranslations('Controls');
  const {data} = usePreferenceOptions();
  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger
        className={compact ? 'preference-select preference-select-compact' : 'preference-select'}
        aria-label={t('currency')}
      >
        {compact ? <Banknote aria-hidden="true" /> : null}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {data.currencies.map((item) => (
          <SelectItem key={item.code} value={item.code}>
            {item.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
