// src/components/ui/Button.tsx

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/config/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-on-primary hover:opacity-90',
        secondary:
          'bg-secondary-container text-on-secondary-container hover:opacity-90',
        ghost:
          'bg-transparent text-on-surface hover:bg-surface-container-high',
        danger:
          'bg-error text-on-error hover:opacity-90',
      },

      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant,
      size,
      icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const iconNode = icon ? (
      <span className="material-symbols-outlined text-[18px]">
        {loading ? 'progress_activity' : icon}
      </span>
    ) : null;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          buttonVariants({ variant, size }),
          className,
        )}
        {...props}
      >
        {iconPosition === 'left' && iconNode}

        {children}

        {iconPosition === 'right' && iconNode}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { buttonVariants };
