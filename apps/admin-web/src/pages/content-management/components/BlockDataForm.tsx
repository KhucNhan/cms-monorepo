import { HeroBlockEditor } from './block-editors/HeroBlockEditor';
import { RichTextBlockEditor } from './block-editors/RichTextBlockEditor';
import { FaqBlockEditor } from './block-editors/FaqBlockEditor';
import { JsonBlockEditor } from './block-editors/JsonBlockEditor';

interface BlockDataFormProps {
  type: string;
  data: any;
  onChange: (newData: any) => void;
}

function normalizeBlockType(type: string): string {
  if (type === 'rich_text' || type === 'richtext') return 'rich-text';
  return type;
}

export function BlockDataForm({ type, data, onChange }: BlockDataFormProps) {
  switch (normalizeBlockType(type)) {
    case 'hero':
      return <HeroBlockEditor data={data} onChange={onChange} />;
    case 'rich-text':
      return <RichTextBlockEditor data={data} onChange={onChange} />;
    case 'faq':
      return <FaqBlockEditor data={data} onChange={onChange} />;
    default:
      return <JsonBlockEditor data={data} onChange={onChange} />;
  }
}
