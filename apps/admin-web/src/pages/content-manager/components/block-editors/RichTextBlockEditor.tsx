import type { RichTextBlockData } from '@/types';
import {
  contentToHtmlFallback,
  getRichTextDisplayText,
  plainTextToContent,
} from './rich-text.utils';

interface RichTextBlockEditorProps {
  data: RichTextBlockData;
  onChange: (newData: RichTextBlockData) => void;
}

export function RichTextBlockEditor({ data, onChange }: RichTextBlockEditorProps) {
  const textAlign = data.textAlign ?? 'left';
  const displayText = getRichTextDisplayText(data);

  const handleContentChange = (newText: string) => {
    const nextContent = plainTextToContent(newText);
    onChange({
      ...data,
      content: nextContent,
      htmlFallback: contentToHtmlFallback(nextContent),
    });
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">Text Alignment</label>
        <select
          value={textAlign}
          onChange={(e) => onChange({ ...data, textAlign: e.target.value as RichTextBlockData['textAlign'] })}
          className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none max-w-xs"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>

      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">Content</label>
        <textarea
          rows={6}
          value={displayText}
          onChange={(e) => handleContentChange(e.target.value)}
          className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none w-full"
          placeholder="Write your content here..."
        />
        <p className="text-[11px] text-on-surface-variant">
          Edits update the ProseMirror <code className="font-mono">content</code> field. Use new lines for separate paragraphs.
        </p>
      </div>
    </div>
  );
}
