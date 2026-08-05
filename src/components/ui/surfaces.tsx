'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Info,
  PackageOpen,
  RotateCcw,
  Star
} from 'lucide-react';
import {useMemo, useState, type ComponentProps, type ReactNode} from 'react';
import {toast} from 'sonner';

import {cn} from '@/lib/utils';
import {Button} from './button';
import {Checkbox} from './form-controls';

export function Card({
  className,
  interactive,
  ...props
}: ComponentProps<'div'> & {interactive?: boolean}) {
  return (
    <div className={cn('ui-card', interactive && 'ui-card-interactive', className)} {...props} />
  );
}
export function CardHeader(props: ComponentProps<'div'>) {
  return <div className={cn('ui-card-header', props.className)} {...props} />;
}
export function CardTitle(props: ComponentProps<'h3'>) {
  return <h3 className={cn('ui-card-title', props.className)} {...props} />;
}
export function CardDescription(props: ComponentProps<'p'>) {
  return <p className={cn('ui-card-description', props.className)} {...props} />;
}
export function CardContent(props: ComponentProps<'div'>) {
  return <div className={cn('ui-card-content', props.className)} {...props} />;
}
export function CardFooter(props: ComponentProps<'div'>) {
  return <div className={cn('ui-card-footer', props.className)} {...props} />;
}

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & {tone?: Tone}) {
  return <span className={cn('ui-badge', `ui-tone-${tone}`, className)} {...props} />;
}
export function Tag({
  tone = 'neutral',
  removable,
  onRemove,
  children,
  className
}: ComponentProps<'span'> & {tone?: Tone; removable?: boolean; onRemove?: () => void}) {
  return (
    <span className={cn('ui-tag', `ui-tone-${tone}`, className)}>
      {children}
      {removable ? (
        <button type="button" onClick={onRemove} aria-label="Remove tag">
          ×
        </button>
      ) : null}
    </span>
  );
}

export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  status
}: {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'away' | 'offline';
}) {
  return (
    <span className="ui-avatar-wrap">
      <AvatarPrimitive.Root className={cn('ui-avatar', `ui-avatar-${size}`)}>
        <AvatarPrimitive.Image src={src} alt={alt} className="ui-avatar-image" />
        <AvatarPrimitive.Fallback className="ui-avatar-fallback" delayMs={200}>
          {fallback}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {status ? (
        <span className={cn('ui-avatar-status', `ui-avatar-${status}`)} aria-label={status} />
      ) : null}
    </span>
  );
}

export const Tabs = TabsPrimitive.Root;
export function TabsList({className, ...props}: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('ui-tabs-list', className)} {...props} />;
}
export function TabsTrigger({className, ...props}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn('ui-tabs-trigger', className)} {...props} />;
}
export function TabsContent({className, ...props}: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('ui-tabs-content', className)} {...props} />;
}

export const Accordion = AccordionPrimitive.Root;
export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn('ui-accordion-item', className)} {...props} />;
}
export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger className={cn('ui-accordion-trigger', className)} {...props}>
        {children}
        <ChevronDown aria-hidden="true" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className={cn('ui-accordion-content', className)} {...props}>
      <div>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export function Breadcrumb({items}: {items: Array<{label: string; href?: string}>}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="ui-breadcrumb">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index > 0 ? <ChevronRight aria-hidden="true" className="rtl:-scale-x-100" /> : null}
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  pages,
  onPageChange
}: {
  page: number;
  pages: number;
  onPageChange?: (page: number) => void;
}) {
  const visible = Array.from({length: Math.min(pages, 5)}, (_, index) => index + 1);
  return (
    <nav aria-label="Pagination" className="ui-pagination">
      <Button
        size="icon"
        variant="outline"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => onPageChange?.(page - 1)}
      >
        <ChevronLeft aria-hidden="true" className="rtl:-scale-x-100" />
      </Button>
      {visible.map((number) => (
        <Button
          key={number}
          size="icon"
          variant={number === page ? 'default' : 'ghost'}
          aria-current={number === page ? 'page' : undefined}
          onClick={() => onPageChange?.(number)}
        >
          {number}
        </Button>
      ))}
      <Button
        size="icon"
        variant="outline"
        disabled={page >= pages}
        aria-label="Next page"
        onClick={() => onPageChange?.(page + 1)}
      >
        <ChevronRight aria-hidden="true" className="rtl:-scale-x-100" />
      </Button>
    </nav>
  );
}

export type TableColumn<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  editable?: boolean;
  align?: 'start' | 'center' | 'end';
};
export function DataTable<T extends {id: string}>({
  rows,
  columns
}: {
  rows: T[];
  columns: TableColumn<T>[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{key: string; direction: 'asc' | 'desc'} | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return rows;
    return [...rows].sort(
      (a, b) =>
        String(column.value(a)).localeCompare(String(column.value(b)), undefined, {numeric: true}) *
        (sort.direction === 'asc' ? 1 : -1)
    );
  }, [columns, rows, sort]);
  const allSelected = rows.length > 0 && selected.size === rows.length;
  return (
    <div className="ui-table-shell">
      <div className="ui-table-toolbar">
        <span>{selected.size > 0 ? `${selected.size} selected` : `${rows.length} items`}</span>
        {selected.size > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        ) : null}
      </div>
      <div className="ui-table-scroll">
        <table className="ui-table">
          <thead>
            <tr>
              <th>
                <Checkbox
                  label="Select all rows"
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set())
                  }
                />
              </th>
              {columns.map((column) => (
                <th key={column.key} data-align={column.align}>
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSort((current) =>
                          current?.key === column.key
                            ? {
                                key: column.key,
                                direction: current.direction === 'asc' ? 'desc' : 'asc'
                              }
                            : {key: column.key, direction: 'asc'}
                        )
                      }
                    >
                      {column.label}
                      {sort?.key === column.key ? (
                        sort.direction === 'asc' ? (
                          <ArrowUp />
                        ) : (
                          <ArrowDown />
                        )
                      ) : (
                        <ArrowUpDown />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} data-selected={selected.has(row.id) || undefined}>
                <td>
                  <Checkbox
                    label={`Select ${row.id}`}
                    checked={selected.has(row.id)}
                    onCheckedChange={(checked) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      })
                    }
                  />
                </td>
                {columns.map((column) => (
                  <td key={column.key} data-align={column.align}>
                    {column.editable ? (
                      <input
                        aria-label={`Edit ${column.label}`}
                        value={edits[`${row.id}:${column.key}`] ?? String(column.value(row))}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [`${row.id}:${column.key}`]: event.target.value
                          }))
                        }
                      />
                    ) : (
                      (column.render?.(row) ?? column.value(row))
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children
}: {
  tone?: Exclude<Tone, 'neutral' | 'accent'>;
  title: string;
  children: ReactNode;
}) {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'danger'
          ? AlertCircle
          : Info;
  return (
    <div
      className={cn('ui-alert', `ui-tone-${tone}`)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Progress({
  value,
  label,
  showValue = true
}: {
  value: number;
  label?: string;
  showValue?: boolean;
}) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className="ui-progress-wrap">
      {label || showValue ? (
        <div className="ui-progress-label">
          <span>{label}</span>
          {showValue ? <strong>{safe}%</strong> : null}
        </div>
      ) : null}
      <ProgressPrimitive.Root className="ui-progress" value={safe}>
        <ProgressPrimitive.Indicator
          className="ui-progress-indicator"
          style={{transform: `translateX(${safe - 100}%)`}}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}

export function Rating({
  value,
  onChange,
  label = 'Rating'
}: {
  value: number;
  onChange?: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="ui-rating" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} stars`}
          onClick={() => onChange?.(star)}
        >
          <Star aria-hidden="true" data-filled={star <= value || undefined} />
        </button>
      ))}
    </div>
  );
}

export type Step = {title: string; description?: string};
export function Stepper({steps, current}: {steps: Step[]; current: number}) {
  return (
    <ol className="ui-stepper">
      {steps.map((step, index) => (
        <li
          key={step.title}
          data-complete={index < current || undefined}
          data-current={index === current || undefined}
        >
          <span>{index < current ? <Check aria-hidden="true" /> : index + 1}</span>
          <div>
            <strong>{step.title}</strong>
            {step.description ? <small>{step.description}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export type TimelineEvent = {
  title: string;
  detail: string;
  time: string;
  state?: 'complete' | 'current' | 'upcoming';
};
export function Timeline({events}: {events: TimelineEvent[]}) {
  return (
    <ol className="ui-timeline">
      {events.map((event) => (
        <li key={`${event.title}-${event.time}`} data-state={event.state ?? 'upcoming'}>
          <span className="ui-timeline-dot">
            {event.state === 'complete' ? <Check aria-hidden="true" /> : null}
          </span>
          <div>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
            <time>{event.time}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Skeleton({className, ...props}: ComponentProps<'div'>) {
  return <div className={cn('ui-skeleton', className)} aria-hidden="true" {...props} />;
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="ui-state">
      <div className="ui-state-illustration" aria-hidden="true">
        <span />
        <span />
        <PackageOpen />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="ui-state ui-error-state">
      <div className="ui-state-icon">
        <AlertCircle aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function showToastExample() {
  toast.success('Order confirmed', {
    description: 'Your delivery is now processing.',
    icon: <Inbox aria-hidden="true" />
  });
}
