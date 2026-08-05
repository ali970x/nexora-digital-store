import {hasLocale} from 'next-intl';
import {getRequestConfig} from 'next-intl/server';

import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const catalog = await import(`../../messages/${locale}.json`).catch(
    () => import('../../messages/en.json')
  );
  return {
    locale,
    messages: catalog.default
  };
});
