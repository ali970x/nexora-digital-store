'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import {OTPInput, OTPInputContext, type OTPInputProps} from 'input-otp';
import {Check, ChevronDown, ChevronsUpDown, FileUp, ImageIcon, Search, X} from 'lucide-react';
import Image from 'next/image';
import {
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react';

import {cn} from '@/lib/utils';
import {Button} from './button';
import {Popover, PopoverContent, PopoverTrigger} from './overlays';

type FieldShellProps = {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
};

function FieldShell({label, helper, error, required, htmlFor, children}: FieldShellProps) {
  return (
    <div className="ui-field" data-invalid={Boolean(error) || undefined}>
      {label ? (
        <LabelPrimitive.Root className="ui-label" htmlFor={htmlFor}>
          {label}
          {required ? <span aria-hidden="true">*</span> : null}
        </LabelPrimitive.Root>
      ) : null}
      {children}
      {error ? (
        <p className="ui-field-error">{error}</p>
      ) : helper ? (
        <p className="ui-field-helper">{helper}</p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {className, error, helper, id: suppliedId, label, leadingIcon, required, trailingIcon, ...props},
  ref
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <FieldShell htmlFor={id} label={label} helper={helper} error={error} required={required}>
      <div className="ui-input-shell">
        {leadingIcon ? <span className="ui-input-icon">{leadingIcon}</span> : null}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          className={cn('ui-input', className)}
          {...props}
        />
        {trailingIcon ? <span className="ui-input-icon">{trailingIcon}</span> : null}
      </div>
    </FieldShell>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helper?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {className, error, helper, id: suppliedId, label, required, ...props},
  ref
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <FieldShell htmlFor={id} label={label} helper={helper} error={error} required={required}>
      <textarea
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        className={cn('ui-textarea', className)}
        {...props}
      />
    </FieldShell>
  );
});

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn('ui-select-trigger', className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" className="ui-select-chevron" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn('ui-select-content', className)}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport className="ui-select-viewport">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn('ui-select-item', className)} {...props}>
      <SelectPrimitive.ItemIndicator className="ui-select-check">
        <Check aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export type ComboboxOption = {value: string; label: string; detail?: string};

export function Combobox({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage
}: {
  label?: string;
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder: string;
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );
  return (
    <div className="ui-field">
      {label ? <span className="ui-label">{label}</span> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="ui-combobox-trigger" aria-expanded={open}>
            <span>{selected?.label ?? placeholder}</span>
            <ChevronsUpDown aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="ui-combobox-content" align="start">
          <div className="ui-combobox-search">
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
            />
          </div>
          <div className="ui-combobox-list" role="listbox">
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onValueChange?.(option.value);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.detail ? <small>{option.detail}</small> : null}
                </span>
                {option.value === value ? <Check aria-hidden="true" /> : null}
              </button>
            ))}
            {filtered.length === 0 ? <p className="ui-combobox-empty">{emptyMessage}</p> : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Checkbox({
  label,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & {label: string}) {
  const id = useId();
  return (
    <div className="ui-choice-row">
      <CheckboxPrimitive.Root id={id} className="ui-checkbox" {...props}>
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <LabelPrimitive.Root htmlFor={id}>{label}</LabelPrimitive.Root>
    </div>
  );
}

export const RadioGroup = RadioGroupPrimitive.Root;
export function RadioItem({
  label,
  value,
  ...props
}: Omit<ComponentProps<typeof RadioGroupPrimitive.Item>, 'value'> & {
  label: string;
  value: string;
}) {
  const id = useId();
  return (
    <div className="ui-choice-row">
      <RadioGroupPrimitive.Item id={id} value={value} className="ui-radio" {...props}>
        <RadioGroupPrimitive.Indicator />
      </RadioGroupPrimitive.Item>
      <LabelPrimitive.Root htmlFor={id}>{label}</LabelPrimitive.Root>
    </div>
  );
}

export function Switch({
  label,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root> & {label: string}) {
  const id = useId();
  return (
    <div className="ui-switch-row">
      <LabelPrimitive.Root htmlFor={id}>{label}</LabelPrimitive.Root>
      <SwitchPrimitive.Root id={id} className="ui-switch" {...props}>
        <SwitchPrimitive.Thumb className="ui-switch-thumb" />
      </SwitchPrimitive.Root>
    </div>
  );
}

export function Slider({
  label,
  valueLabel,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root> & {label?: string; valueLabel?: string}) {
  return (
    <div className="ui-field">
      {label ? (
        <div className="ui-slider-label">
          <span>{label}</span>
          <strong>{valueLabel}</strong>
        </div>
      ) : null}
      <SliderPrimitive.Root className="ui-slider" {...props}>
        <SliderPrimitive.Track className="ui-slider-track">
          <SliderPrimitive.Range className="ui-slider-range" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="ui-slider-thumb" />
      </SliderPrimitive.Root>
    </div>
  );
}

type OtpFieldProps = Omit<OTPInputProps, 'children' | 'maxLength' | 'render'> & {
  maxLength?: number;
};

export function OtpField({maxLength = 6, ...props}: OtpFieldProps) {
  return (
    <OTPInput maxLength={maxLength} containerClassName="ui-otp" {...props}>
      {Array.from({length: maxLength}, (_, index) => (
        <OtpSlot key={index} index={index} />
      ))}
    </OTPInput>
  );
}

function OtpSlot({index}: {index: number}) {
  const context = useContext(OTPInputContext);
  const slot = context.slots[index];
  if (!slot) return null;
  return (
    <div className="ui-otp-slot" data-active={slot.isActive || undefined}>
      {slot.char}
      {slot.hasFakeCaret ? <span className="ui-otp-caret" /> : null}
    </div>
  );
}

export function FileUpload({
  label,
  description,
  limits,
  previewAlt,
  removeLabel,
  accept = 'image/*',
  onFilesChange
}: {
  label?: string;
  description: string;
  limits: string;
  previewAlt: string;
  removeLabel: string;
  accept?: string;
  onFilesChange?: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const previewUrl = useMemo(
    () => (files[0]?.type.startsWith('image/') ? URL.createObjectURL(files[0]) : null),
    [files]
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );
  const updateFiles = (next: File[]) => {
    setFiles(next);
    onFilesChange?.(next);
  };
  return (
    <div className="ui-file-upload">
      <button
        type="button"
        className="ui-dropzone"
        data-dragging={dragging || undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          updateFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <span className="ui-dropzone-icon">
          <FileUp aria-hidden="true" />
        </span>
        <strong>{label}</strong>
        <span>{description}</span>
        <small>{limits}</small>
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => updateFiles(Array.from(event.target.files ?? []))}
      />
      {files[0] ? (
        <div className="ui-file-preview">
          {previewUrl ? (
            <Image src={previewUrl} alt={previewAlt} width={56} height={56} unoptimized />
          ) : (
            <ImageIcon aria-hidden="true" />
          )}
          <span>
            <strong>{files[0].name}</strong>
            <small>{Math.max(1, Math.round(files[0].size / 1024))} KB</small>
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={removeLabel}
            onClick={() => updateFiles([])}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
