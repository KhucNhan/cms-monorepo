import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/config/cn';
import type { ContentStatus } from '@/types';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors',
  {
    variants: {
      variant: {
        published: 'bg-emerald-100 text-emerald-800',
        draft: 'bg-amber-100 text-amber-800',
        archived: 'bg-surface-container-high text-on-surface-variant',
        tag: 'bg-surface-container-high text-secondary uppercase tracking-tight font-semibold',
      },
    },
    defaultVariants: {
      variant: 'published',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({
  className,
  variant,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

Badge.displayName = 'Badge';

const statusConfig: Record<
  ContentStatus,
  {
    dot: string;
    label: string;
    variant: 'published' | 'draft' | 'archived';
  }
> = {
  published: {
    dot: 'bg-emerald-600',
    label: 'Published',
    variant: 'published',
  },
  draft: {
    dot: 'bg-amber-600',
    label: 'Draft',
    variant: 'draft',
  },
  archived: {
    dot: 'bg-outline',
    label: 'Archived',
    variant: 'archived',
  },
};

interface StatusBadgeProps {
  status: ContentStatus;
  className?: string;
}

export function StatusBadge({
  status,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={className}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          config.dot,
        )}
      />
      {config.label}
    </Badge>
  );
}

export function TagBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Badge variant="tag" className={className}>
      {label}
    </Badge>
  );
}

export { Badge, badgeVariants };
