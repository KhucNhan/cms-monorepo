import { HeroBlockDisplay } from './block-views/HeroBlockDisplay';
import { RichTextBlockDisplay } from './block-views/RichTextBlockDisplay';
import { FaqBlockDisplay } from './block-views/FaqBlockDisplay';
import { JsonBlockDisplay } from './block-views/JsonBlockDisplay';

interface BlockDataDisplayProps {
  type: string;
  data: unknown;
}

function normalizeBlockType(type: string): string {
  if (type === 'rich_text' || type === 'richtext') return 'rich-text';
  return type;
}

export function BlockDataDisplay({ type, data }: BlockDataDisplayProps) {
  switch (normalizeBlockType(type)) {
    case 'hero':
      return <HeroBlockDisplay data={data as any} />;
    case 'rich-text':
      return <RichTextBlockDisplay data={data as any} />;
    case 'faq':
      return <FaqBlockDisplay data={data as any} />;
    default:
      return <JsonBlockDisplay data={data} />;
  }
}