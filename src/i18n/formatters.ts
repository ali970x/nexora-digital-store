export function formatCurrency(
  minorUnits: number | bigint,
  currency: string,
  locale: string,
  minorUnitDigits = 2
): string {
  const amount = Number(minorUnits) / 10 ** minorUnitDigits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minorUnitDigits,
    maximumFractionDigits: minorUnitDigits
  }).format(amount);
}

export function formatNumber(value: number | bigint, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(
  value: Date | string | number,
  locale: string,
  options: Intl.DateTimeFormatOptions = {dateStyle: 'medium', timeStyle: 'short'}
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatRelativeTime(
  value: Date | string | number,
  locale: string,
  now = Date.now()
): string {
  const deltaSeconds = (new Date(value).getTime() - now) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1]
  ];
  const [unit, seconds] = units.find(([, size]) => Math.abs(deltaSeconds) >= size) ?? ['second', 1];
  return new Intl.RelativeTimeFormat(locale, {numeric: 'auto'}).format(
    Math.round(deltaSeconds / seconds),
    unit
  );
}
