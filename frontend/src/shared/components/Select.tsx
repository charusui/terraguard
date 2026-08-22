'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** extra classes on the trigger, e.g. to cap its width */
  className?: string;
  'aria-label'?: string;
}

/**
 * Custom-styled dropdown — a native <select>'s open popup is OS chrome
 * that CSS can't reach, so it always looks out of place next to the
 * rest of the app. Built on Radix's unstyled Select primitive instead,
 * styled to match .field / the prompt-bar menus.
 */
export function Select({ value, onChange, options, placeholder, className, 'aria-label': ariaLabel }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger className={`select-trigger ${className ?? ''}`} aria-label={ariaLabel}>
        <RadixSelect.Value className="select-trigger-value" placeholder={placeholder} />
        <RadixSelect.Icon className="select-trigger-icon">
          <CaretDown size={14} weight="bold" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className="select-content" position="popper" sideOffset={6}>
          <RadixSelect.Viewport className="select-viewport">
            {options.map(opt => (
              <RadixSelect.Item key={opt.value} value={opt.value} className="select-item">
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="select-item-indicator">
                  <Check size={14} weight="bold" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
