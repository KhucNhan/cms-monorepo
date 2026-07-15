import type { BlockEditorProps } from '../../types';
import type { RichTextData } from './schema';
import {
  contentToHtmlFallback,
  getRichTextDisplayText,
  plainTextToContent,
} from './rich-text.utils';

/**
 * `variant`:
 * - 'admin' (mặc định): kích thước như cũ.
 * - 'web': input/text nhỏ hơn, gọn hơn (apps/web edit-mode). Layout vốn đã 1 cột dọc
 *   nên không cần đổi cấu trúc grid, chỉ đổi spacing/kích thước.
 */
export function RichTextEditor({
  value,
  onChange,
  variant = 'admin',
}: BlockEditorProps<RichTextData>) {
  const isWeb = variant === 'web';

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

  const labelCls = isWeb
    ? 'text-label-sm font-bold text-on-surface'
    : 'text-label-md font-bold text-on-surface';
  const selectCls = isWeb
    ? 'max-w-xs rounded-md border border-outline-variant bg-surface px-xs py-1 text-body-sm outline-none focus:border-primary'
    : 'max-w-xs rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary';
  const textareaCls = isWeb
    ? 'w-full pl-2 rounded-md border border-outline-variant bg-surface px-xs py-1 text-body-sm outline-none focus:border-primary'
    : 'w-full rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary';

  return (
    <div className={isWeb ? 'flex flex-col gap-sm' : 'flex flex-col gap-md'}>
      {/* Text Alignment */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Text Alignment</label>

        <select
          value={textAlign}
          onChange={(e) =>
            onChange({
              ...value,
              textAlign: e.target.value as RichTextData['textAlign'],
            })
          }
          className={selectCls}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Content</label>

        <textarea
          rows={isWeb ? 4 : 6}
          value={displayText}
          onChange={(e) => handleContentChange(e.target.value)}
          className={textareaCls}
          placeholder="Write your content here..."
        />

        <p className={isWeb ? 'text-[10px] text-on-surface-variant' : 'text-[11px] text-on-surface-variant'}>
          Edits update the ProseMirror <code className="font-mono">content</code> field. Use new
          lines for separate paragraphs.
        </p>
      </div>
    </div>
  );
}