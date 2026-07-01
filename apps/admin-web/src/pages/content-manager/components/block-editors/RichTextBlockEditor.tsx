import type { RichTextBlockData } from '@/types';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        <Select
          value={textAlign}
          onValueChange={(value) =>
            onChange({ ...data, textAlign: value as RichTextBlockData['textAlign'] })
          }
        >
          <SelectTrigger className="bg-surface border-outline-variant max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface text-on-surface border border-outline-variant">
            <SelectGroup>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="justify">Justify</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
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