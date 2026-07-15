// src/components/ui/SearchInput.tsx

import { Search, X } from 'lucide-react';

import { cn } from '@/config/cn';
import { Input } from '@/components/ui/Input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />

      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
