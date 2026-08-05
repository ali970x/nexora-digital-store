'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {Check, ChevronRight, Circle, X} from 'lucide-react';
import type {ComponentProps} from 'react';

import {cn} from '@/lib/utils';

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn('ui-tooltip', className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn('ui-popover', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;
export const DropdownGroup = DropdownPrimitive.Group;
export const DropdownSub = DropdownPrimitive.Sub;
export const DropdownRadioGroup = DropdownPrimitive.RadioGroup;

export function DropdownContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn('ui-dropdown', className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownItem({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Item> & {inset?: boolean}) {
  return (
    <DropdownPrimitive.Item
      className={cn('ui-dropdown-item', inset && 'ui-dropdown-inset', className)}
      {...props}
    />
  );
}

export function DropdownCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof DropdownPrimitive.CheckboxItem>) {
  return (
    <DropdownPrimitive.CheckboxItem
      className={cn('ui-dropdown-item', className)}
      checked={checked}
      {...props}
    >
      <span className="ui-dropdown-indicator">
        <DropdownPrimitive.ItemIndicator>
          <Check aria-hidden="true" />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownPrimitive.RadioItem>) {
  return (
    <DropdownPrimitive.RadioItem className={cn('ui-dropdown-item', className)} {...props}>
      <span className="ui-dropdown-indicator">
        <DropdownPrimitive.ItemIndicator>
          <Circle aria-hidden="true" />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.RadioItem>
  );
}

export function DropdownLabel({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Label> & {inset?: boolean}) {
  return (
    <DropdownPrimitive.Label
      className={cn('ui-dropdown-label', inset && 'ui-dropdown-inset', className)}
      {...props}
    />
  );
}

export function DropdownSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator className={cn('ui-dropdown-separator', className)} {...props} />
  );
}

export function DropdownShortcut(props: ComponentProps<'span'>) {
  return <span className="ui-dropdown-shortcut" {...props} />;
}

export function DropdownSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownPrimitive.SubTrigger>) {
  return (
    <DropdownPrimitive.SubTrigger className={cn('ui-dropdown-item', className)} {...props}>
      {children}
      <ChevronRight aria-hidden="true" className="ui-dropdown-chevron rtl:-scale-x-100" />
    </DropdownPrimitive.SubTrigger>
  );
}

export function DropdownSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.SubContent>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.SubContent className={cn('ui-dropdown', className)} {...props} />
    </DropdownPrimitive.Portal>
  );
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-overlay" />
      <DialogPrimitive.Content className={cn('ui-dialog', className)} {...props}>
        {children}
        <DialogPrimitive.Close className="ui-dialog-close" aria-label="Close">
          <X aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader(props: ComponentProps<'div'>) {
  return <div className={cn('ui-dialog-header', props.className)} {...props} />;
}
export function DialogFooter(props: ComponentProps<'div'>) {
  return <div className={cn('ui-dialog-footer', props.className)} {...props} />;
}
export function DialogTitle({className, ...props}: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('ui-dialog-title', className)} {...props} />;
}
export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('ui-dialog-description', className)} {...props} />
  );
}

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = 'end',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {side?: 'start' | 'end' | 'top' | 'bottom'}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-overlay" />
      <DialogPrimitive.Content className={cn('ui-sheet', `ui-sheet-${side}`, className)} {...props}>
        {children}
        <DialogPrimitive.Close className="ui-dialog-close" aria-label="Close">
          <X aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;
export function DrawerContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-overlay" />
      <DialogPrimitive.Content className={cn('ui-drawer', className)} {...props}>
        <span className="ui-drawer-handle" aria-hidden="true" />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export const DrawerTitle = DialogTitle;
export const DrawerDescription = DialogDescription;
