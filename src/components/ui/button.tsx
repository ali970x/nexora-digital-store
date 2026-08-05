import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {LoaderCircle} from 'lucide-react';
import type {ButtonHTMLAttributes} from 'react';

import {cn} from '@/lib/utils';

const buttonVariants = cva('ui-button', {
  variants: {
    variant: {
      default: 'ui-button-default',
      gradient: 'ui-button-gradient',
      secondary: 'ui-button-secondary',
      outline: 'ui-button-outline',
      ghost: 'ui-button-ghost',
      destructive: 'ui-button-destructive'
    },
    size: {
      xs: 'ui-button-xs',
      sm: 'ui-button-sm',
      md: 'ui-button-md',
      lg: 'ui-button-lg',
      icon: 'ui-button-icon'
    }
  },
  defaultVariants: {variant: 'default', size: 'md'}
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {asChild?: boolean; loading?: boolean};

export function Button({
  asChild,
  children,
  className,
  disabled,
  loading,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot
        className={cn(buttonVariants({variant, size, className}))}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        data-disabled={disabled || loading || undefined}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type}
      className={cn(buttonVariants({variant, size, className}))}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="ui-button-spinner" /> : null}
      {children}
    </button>
  );
}

export {buttonVariants};
