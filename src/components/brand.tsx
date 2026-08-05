import {cn} from '@/lib/utils';

export function Brand({compact, className}: {compact?: boolean; className?: string}) {
  return (
    <span className={cn('brand', className)} aria-label="Nexora">
      <span className="brand-symbol" aria-hidden="true">
        <span />
        <span />
      </span>
      {compact ? null : <span className="brand-word">NEXORA</span>}
    </span>
  );
}
