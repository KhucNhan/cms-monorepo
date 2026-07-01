import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/config/cn';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onChange, ...props }, ref) => (
    <div className={cn('relative group w-64 max-w-md', className)}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] transition-colors group-focus-within:text-primary pointer-events-none">
        search
      </span>

      <input
        ref={ref}
        type="search"
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-outline transition-all duration-200"
        {...props}
      />
    </div>
  ),
);

SearchInput.displayName = 'SearchInput';
