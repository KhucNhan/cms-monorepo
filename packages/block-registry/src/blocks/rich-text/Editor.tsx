import type { BlockEditorProps } from '../../types';
import type { RichTextData } from './schema';
import {
  contentToHtmlFallback,
  getRichTextDisplayText,
  plainTextToContent,
} from './rich-text.utils';

export function RichTextEditor({
  value,
  onChange,
}: BlockEditorProps<RichTextData>) {
  const textAlign = value.textAlign ?? 'left';
  const displayText = getRichTextDisplayText(value);

  const handleContentChange = (newText: string) => {
    const nextContent = plainTextToContent(newText);

    onChange({
      ...value,
      content: nextContent,
      htmlFallback: contentToHtmlFallback(nextContent),
    });
  };

  return (
    <div className="flex flex-col gap-md">
      {/* Text Alignment */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Text Alignment
        </label>

        <select
          value={textAlign}
          onChange={(e) =>
            onChange({
              ...value,
              textAlign: e.target.value as RichTextData['textAlign'],
            })
          }
          className="max-w-xs rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Content
        </label>

        <textarea
          rows={6}
          value={displayText}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
          placeholder="Write your content here..."
        />

        <p className="text-[11px] text-on-surface-variant">
          Edits update the ProseMirror{' '}
          <code className="font-mono">content</code> field. Use new lines for
          separate paragraphs.
        </p>
      </div>
    </div>
  );
}