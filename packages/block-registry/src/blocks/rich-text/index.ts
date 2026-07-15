import { richTextSchema, type RichTextData } from './schema';
import type { BlockDefinition } from '../../types';
import { RichTextEditor } from './Editor';

export const richTextBlock: BlockDefinition<typeof richTextSchema> = {
  type: 'rich-text',
  label: 'Rich Text',
  icon: 'FileText',
  schema: richTextSchema,
  thumbnail: '/block-thumbnails/rich-text.png',
  defaultData: {
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Start writing here...' }],
        },
      ],
    },
    htmlFallback: '<p>Start writing here...</p>',
    textAlign: 'left',
  } satisfies RichTextData,
  Editor: RichTextEditor,
};

export { richTextSchema, type RichTextData };
