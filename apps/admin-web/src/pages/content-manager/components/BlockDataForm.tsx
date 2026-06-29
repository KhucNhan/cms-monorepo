import { HeroBlockEditor } from './block-editors/HeroBlockEditor';
import { RichTextBlockEditor } from './block-editors/RichTextBlockEditor';
import { FaqBlockEditor } from './block-editors/FaqBlockEditor';
import { JsonBlockEditor } from './block-editors/JsonBlockEditor';

interface BlockDataFormProps {
  type: string;
  data: any;
  onChange: (newData: any) => void;
}

export function BlockDataForm({ type, data, onChange }: BlockDataFormProps) {
  switch (type) {
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
