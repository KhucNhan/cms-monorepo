import type { ComponentType } from 'react';
import type { Block, BlockType } from '@/types';
import { HeroBlock } from './HeroBlock';
import { RichTextBlock } from './RichTextBlock';
import { FaqBlock } from './FaqBlock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlockComponent = ComponentType<{ data: any }>;

const registry: Record<BlockType, AnyBlockComponent> = {
  hero: HeroBlock,
  'rich-text': RichTextBlock,
  faq: FaqBlock,
};

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const Component = registry[block.type];

  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2 mx-6 my-2 rounded">
          Unknown block type: <code>{block.type}</code>
        </div>
      );
    }
    return null;
  }

  return <Component data={block.data} />;
}
