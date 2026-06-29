// ─── Block data shapes (mirrors DB field `data` per block type) ───────────────

export interface HeroBlockData {
  title: string;
  subtitle?: string;
  alignment: 'left' | 'center' | 'right';
  buttonText?: string;
  buttonHref?: string;
  overlayOpacity?: number;
  image?: {
    alt: string;
    mediaId: string;
  };
}

export interface RichTextBlockData {
  content: {
    type: 'doc';
    content: ProseMirrorNode[];
  };
  textAlign: 'left' | 'center' | 'right';
  htmlFallback?: string;
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqBlockData {
  heading: string;
  items: FaqItem[];
  allowMultipleOpen: boolean;
}

export type BlockType = 'hero' | 'rich-text' | 'faq';

export interface Block<T = unknown> {
  id: string;
  type: BlockType;
  order: number;
  data: T;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  blocks: Block[];
}
