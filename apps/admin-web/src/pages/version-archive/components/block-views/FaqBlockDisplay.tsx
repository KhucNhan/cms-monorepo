import type { FaqBlockData, FaqItem } from '@/types';

interface FaqBlockDisplayProps {
  data: FaqBlockData;
}

export function FaqBlockDisplay({ data }: FaqBlockDisplayProps) {
  const heading = data.heading ?? '';
  const allowMultipleOpen = data.allowMultipleOpen ?? false;
  const items = (data.items as FaqItem[]) || [];

  return (
    <div className="flex flex-col gap-md">
      {/* Settings row */}
      <div className="grid grid-cols-2 gap-md">
        <div className="flex flex-col gap-0.5">
          <span className="text-label-sm text-on-surface-variant">FAQ Heading</span>
          <span className={`text-body-sm text-on-surface ${!heading ? 'italic text-on-surface-variant' : ''}`}>
            {heading || '—'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-label-sm text-on-surface-variant">Allow Multiple Open</span>
          <div className="flex items-center gap-xs mt-0.5">
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                allowMultipleOpen
                  ? 'bg-primary border-primary text-white'
                  : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              {allowMultipleOpen && (
                <span className="material-symbols-outlined text-[12px]">check</span>
              )}
            </span>
            <span className="text-body-sm text-on-surface">
              {allowMultipleOpen ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-xs">
        <span className="text-label-sm text-on-surface-variant">
          Questions &amp; Answers ({items.length})
        </span>

        {items.length === 0 ? (
          <div className="flex items-center gap-sm py-sm text-on-surface-variant border border-outline-variant rounded-lg px-md">
            <span className="material-symbols-outlined text-[18px] text-outline-variant">help_outline</span>
            <span className="text-body-sm italic">No FAQ items</span>
          </div>
        ) : (
          <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest divide-y divide-outline-variant">
            {items.map((item, idx) => (
              <div key={idx} className="px-md py-sm flex flex-col gap-xs">
                <div className="flex items-baseline gap-sm">
                  <span className="text-label-sm font-semibold text-primary shrink-0">Q{idx + 1}</span>
                  <span className={`text-body-sm font-medium text-on-surface ${!item.question ? 'italic text-on-surface-variant' : ''}`}>
                    {item.question || '—'}
                  </span>
                </div>
                <div className="flex items-baseline gap-sm pl-xs">
                  <span className="text-label-sm font-semibold text-on-surface-variant shrink-0">A</span>
                  <span className={`text-body-sm text-on-surface-variant whitespace-pre-wrap ${!item.answer ? 'italic' : ''}`}>
                    {item.answer || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}