// src/components/ui/Input.tsx

import * as React from 'react';
// import { Search, X } from 'lucide-react';

import { cn } from '@/config/cn';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onIconClick?: () => void;
}

const inputBaseClass = cn(
  'flex h-10 w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface',
  'placeholder:text-on-surface-variant',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'transition-colors',
);

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      helperText,
      error,
      icon,
      iconPosition = 'left',
      onIconClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    const hasLeftIcon = icon && iconPosition === 'left';
    const hasRightIcon = icon && iconPosition === 'right';

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-on-surface">
            {label}
          </label>
        )}

        <div className="relative">
          {hasLeftIcon && (
            <button
              type="button"
              onClick={onIconClick}
              disabled={!onIconClick}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
                onIconClick && 'cursor-pointer',
              )}
            >
              {icon}
            </button>
          )}

          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              inputBaseClass,
              error && 'border-error focus-visible:ring-error',
              hasLeftIcon && 'pl-10',
              hasRightIcon && 'pr-10',
              className,
            )}
            {...props}
          />

          {hasRightIcon && (
            <button
              type="button"
              onClick={onIconClick}
              disabled={!onIconClick}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
                onIconClick && 'cursor-pointer',
              )}
            >
              {icon}
            </button>
          )}
        </div>

        {(helperText || error) && (
          <p
            className={cn(
              'mt-1 text-xs',
              error
                ? 'text-error'
                : 'text-on-surface-variant',
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
