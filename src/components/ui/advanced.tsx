'use client';

import {Command as CommandRoot} from 'cmdk';
import {animate, motion, useMotionValue, useTransform} from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Command as CommandIcon,
  Copy,
  Search,
  TrendingUp
} from 'lucide-react';
import {useLocale} from 'next-intl';
import {useEffect, useId, useState, type ReactNode} from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis
} from 'recharts';
import {toast} from 'sonner';

import type {AppLocale} from '@/i18n/routing';
import {formatMinorUnits, type CurrencyCode} from '@/lib/money';
import {cn} from '@/lib/utils';
import {Button} from './button';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from './overlays';
import {Card} from './surfaces';

export type CommandItem = {
  id: string;
  label: string;
  detail?: string;
  shortcut?: string;
  icon?: ReactNode;
  onSelect?: () => void;
};
export function CommandPalette({
  items,
  open,
  onOpenChange,
  labels
}: {
  items: CommandItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: {
    title: string;
    description: string;
    placeholder: string;
    escape: string;
    noResults: string;
    quickActions: string;
    command: string;
    navigate: string;
    open: string;
  };
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ui-command-dialog">
        <DialogTitle className="sr-only">{labels.title}</DialogTitle>
        <DialogDescription className="sr-only">{labels.description}</DialogDescription>
        <CommandRoot className="ui-command">
          <div className="ui-command-input">
            <Search aria-hidden="true" />
            <CommandRoot.Input placeholder={labels.placeholder} autoFocus />
            <kbd>{labels.escape}</kbd>
          </div>
          <CommandRoot.List>
            <CommandRoot.Empty>{labels.noResults}</CommandRoot.Empty>
            <CommandRoot.Group heading={labels.quickActions}>
              {items.map((item) => (
                <CommandRoot.Item
                  key={item.id}
                  value={`${item.label} ${item.detail ?? ''}`}
                  onSelect={() => {
                    item.onSelect?.();
                    onOpenChange(false);
                  }}
                >
                  {item.icon}
                  <span>
                    <strong>{item.label}</strong>
                    {item.detail ? <small>{item.detail}</small> : null}
                  </span>
                  {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                </CommandRoot.Item>
              ))}
            </CommandRoot.Group>
          </CommandRoot.List>
          <div className="ui-command-footer">
            <span>
              <CommandIcon aria-hidden="true" />
              {labels.command}
            </span>
            <span>
              <kbd>↑↓</kbd> {labels.navigate} <kbd>↵</kbd> {labels.open}
            </span>
          </div>
        </CommandRoot>
      </DialogContent>
    </Dialog>
  );
}

export function CopyButton({
  value,
  label,
  copiedMessage
}: {
  value: string;
  label: string;
  copiedMessage: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(copiedMessage);
    window.setTimeout(() => setCopied(false), 1_500);
  };
  return (
    <Button size="sm" variant="ghost" onClick={() => void copy()}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

export function PriceDisplay({
  amount,
  currency,
  previousAmount,
  size = 'md',
  suffix
}: {
  amount: number;
  currency: CurrencyCode;
  previousAmount?: number;
  size?: 'sm' | 'md' | 'lg';
  suffix?: string;
}) {
  const locale = useLocale() as AppLocale;
  return (
    <span className={cn('ui-price', `ui-price-${size}`)}>
      <strong dir="ltr">{formatMinorUnits(amount, currency, locale)}</strong>
      {previousAmount ? (
        <del dir="ltr">{formatMinorUnits(previousAmount, currency, locale)}</del>
      ) : null}
      {suffix ? <small>{suffix}</small> : null}
    </span>
  );
}

export function CountdownTimer({target, compact}: {target: Date; compact?: boolean}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, target.getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [target]);
  const totalSeconds = Math.floor((remaining ?? 0) / 1_000);
  const values = [
    Math.floor(totalSeconds / 86_400),
    Math.floor((totalSeconds % 86_400) / 3_600),
    Math.floor((totalSeconds % 3_600) / 60),
    totalSeconds % 60
  ];
  const labels = ['D', 'H', 'M', 'S'];
  if (compact)
    return (
      <time className="ui-countdown-compact" dateTime={target.toISOString()}>
        {remaining === null
          ? '--:--:--'
          : values
              .slice(1)
              .map((value) => String(value).padStart(2, '0'))
              .join(':')}
      </time>
    );
  return (
    <div className="ui-countdown" aria-label="Time remaining">
      {values.map((value, index) => (
        <span key={labels[index]}>
          <strong>{remaining === null ? '--' : String(value).padStart(2, '0')}</strong>
          <small>{labels[index]}</small>
        </span>
      ))}
    </div>
  );
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(
    motionValue,
    (latest) =>
      `${prefix}${latest.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}${suffix}`
  );
  useEffect(() => {
    const controls = animate(motionValue, value, {duration: 0.8, ease: [0.16, 1, 0.3, 1]});
    return controls.stop;
  }, [motionValue, value]);
  return <motion.span className={className}>{rounded}</motion.span>;
}

export function StatCard({
  label,
  value,
  change,
  trend = 'up',
  icon
}: {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon?: ReactNode;
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="ui-stat-card" interactive>
      <div className="ui-stat-icon">{icon ?? <TrendingUp aria-hidden="true" />}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {change ? (
        <small data-trend={trend}>
          <TrendIcon aria-hidden="true" />
          {change}
        </small>
      ) : null}
    </Card>
  );
}

const chartData = [
  {label: 'Mon', value: 34},
  {label: 'Tue', value: 48},
  {label: 'Wed', value: 41},
  {label: 'Thu', value: 67},
  {label: 'Fri', value: 58},
  {label: 'Sat', value: 84},
  {label: 'Sun', value: 76}
];

export function ChartCard({
  title = 'Revenue pulse',
  value = '$28,420',
  change = '+18.4%',
  data = chartData
}: {
  title?: string;
  value?: string;
  change?: string;
  data?: Array<{label: string; value: number}>;
}) {
  const gradientId = `chart-${useId().replaceAll(':', '')}`;
  return (
    <Card className="ui-chart-card">
      <div className="ui-chart-header">
        <div>
          <span>{title}</span>
          <strong>{value}</strong>
        </div>
        <BadgeDelta>{change}</BadgeDelta>
      </div>
      <div className="ui-chart" aria-label={`${title}: ${value}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{top: 8, right: 8, bottom: 0, left: 8}}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.42} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{fill: 'var(--text-muted)', fontSize: 11}}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{stroke: 'var(--accent)', strokeDasharray: '4 4'}}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{value?: number}>;
  label?: string;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="ui-chart-tooltip">
      <span>{label}</span>
      <strong>{payload[0].value?.toLocaleString()}</strong>
    </div>
  );
}

function BadgeDelta({children}: {children: ReactNode}) {
  return (
    <span className="ui-chart-delta">
      <ArrowUpRight aria-hidden="true" />
      {children}
    </span>
  );
}
