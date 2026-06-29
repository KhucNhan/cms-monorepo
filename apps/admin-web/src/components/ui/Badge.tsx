import { cn } from '@/config/cn';
import type { ContentStatus } from '@/types';

interface BadgeProps {
  status: ContentStatus;
  className?: string;
}

const config: Record<ContentStatus, { dot: string; bg: string; text: string; label: string }> = {
  published: {
    dot:   'bg-emerald-600',
    bg:    'bg-emerald-100',
    text:  'text-emerald-800',
    label: 'Published',
  },
  draft: {
    dot:   'bg-amber-600',
    bg:    'bg-amber-100',
    text:  'text-amber-800',
    label: 'Draft',
  },
  archived: {
    dot:   'bg-outline',
    bg:    'bg-surface-container-high',
    text:  'text-on-surface-variant',
    label: 'Archived',
  },
};

export function StatusBadge({ status, className }: BadgeProps) {
  const c = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold',
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  );
}

// Generic tag badge (for categories)
export function TagBadge({ label }: { label: string }) {
  return (
    <span className="bg-surface-container-high px-2 py-0.5 rounded text-[11px] font-semibold text-secondary uppercase tracking-tight">
      {label}
    </span>
  );
}
