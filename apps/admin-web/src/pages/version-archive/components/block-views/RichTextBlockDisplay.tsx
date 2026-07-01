import type { RichTextBlockData } from '@/types';
import { getRichTextDisplayText } from '@/pages/content-manager/components/block-editors/rich-text.utils';

interface RichTextBlockDisplayProps {
  data: RichTextBlockData;
}

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

const ALIGN_LABEL: Record<string, string> = {
  left: 'Left',
  center: 'Center',
  right: 'Right',
  justify: 'Justify',
};

export function RichTextBlockDisplay({ data }: RichTextBlockDisplayProps) {
  const textAlign = data.textAlign ?? 'left';
  const displayText = getRichTextDisplayText(data);

  return (
    <div className="flex flex-col gap-md">
      {/* Text alignment badge */}
      <div className="flex flex-col gap-0.5">
        <span className="text-label-sm text-on-surface-variant">Text Alignment</span>
        <span className="text-body-sm text-on-surface">{ALIGN_LABEL[textAlign] ?? textAlign}</span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-xs">
        <span className="text-label-sm text-on-surface-variant">Content</span>
        {displayText.trim() ? (
          <div
            className={`text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed border border-outline-variant rounded-lg px-md py-sm bg-surface-container-lowest ${
              ALIGN_CLASS[textAlign] ?? 'text-left'
            }`}
          >
            {displayText}
          </div>
        ) : (
          <div className="flex items-center gap-sm border border-outline-variant rounded-lg px-md py-sm bg-surface-container-lowest text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-outline-variant">notes</span>
            <span className="text-body-sm italic">No content</span>
          </div>
        )}
      </div>
    </div>
  );
}