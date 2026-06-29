import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/config/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  onIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, iconPosition = 'left', onIconClick, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <div className="relative group">
          {icon && iconPosition === 'left' && (
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] transition-colors group-focus-within:text-primary pointer-events-none">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'placeholder:text-outline transition-all duration-200',
              'px-md py-3',
              icon && iconPosition === 'left'  && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              error && 'border-error focus:ring-error/20',
              className,
            )}
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <button
              type="button"
              onClick={onIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </button>
          )}
        </div>

        {(helperText || error) && (
          <p className={cn('text-[11px]', error ? 'text-error' : 'text-on-surface-variant')}>
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
