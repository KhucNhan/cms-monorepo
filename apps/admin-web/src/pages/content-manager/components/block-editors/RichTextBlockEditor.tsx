import type { RichTextBlockData } from '@/types';

interface RichTextBlockEditorProps {
  data: RichTextBlockData;
  onChange: (newData: RichTextBlockData) => void;
}

export function RichTextBlockEditor({ data, onChange }: RichTextBlockEditorProps) {
  const htmlFallback = data.htmlFallback ?? '';
  const textAlign = data.textAlign ?? 'left';

  const handleHtmlChange = (newHtml: string) => {
    const plainText = newHtml.replace(/<[^>]*>/g, '');
    const contentDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: plainText || ' ',
            },
          ],
        },
      ],
    };
    onChange({
      ...data,
      htmlFallback: newHtml,
      content: contentDoc,
    });
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">Text Alignment</label>
        <select
          value={textAlign}
          onChange={(e) => onChange({ ...data, textAlign: e.target.value as any })}
          className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none max-w-xs"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>

      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">HTML Content</label>
        <textarea
          rows={6}
          value={htmlFallback}
          onChange={(e) => handleHtmlChange(e.target.value)}
          className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md font-mono focus:border-primary outline-none w-full"
          placeholder="<p>Write your HTML content here...</p>"
        />
      </div>
    </div>
  );
}
