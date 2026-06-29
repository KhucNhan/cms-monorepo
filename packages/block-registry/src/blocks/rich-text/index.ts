import { richTextSchema, type RichTextData } from './schema';
import type { BlockDefinition } from '../../types';

export const richTextBlock: BlockDefinition<typeof richTextSchema> = {
  type: 'rich-text',
  label: 'Rich Text',
  icon: 'FileText',
  schema: richTextSchema,
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
};

export { richTextSchema, type RichTextData };
