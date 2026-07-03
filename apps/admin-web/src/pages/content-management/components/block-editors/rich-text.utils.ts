import type { RichTextBlockData } from '@/types';

type ProseMirrorNode = {
  type?: string;
  text?: string;
  content?: ProseMirrorNode[];
};

function walkNodes(nodes: ProseMirrorNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.text ?? '';
      if (node.type === 'hardBreak') return '\n';
      if (node.content?.length) return walkNodes(node.content);
      return '';
    })
    .join('');
}

/** Extract plain text from ProseMirror JSON — never from htmlFallback */
export function extractPlainTextFromContent(raw: unknown): string {
  if (raw == null) return '';

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object') {
        return extractPlainTextFromContent(parsed);
      }
    } catch {
      // Plain string stored directly in content field
      return stripHtml(trimmed);
    }
    return stripHtml(trimmed);
  }

  if (Array.isArray(raw)) {
    return walkNodes(raw as ProseMirrorNode[]);
  }

  if (typeof raw === 'object') {
    const doc = raw as ProseMirrorNode & Record<string, unknown>;

    if (typeof doc.text === 'string') {
      return doc.text;
    }

    if (doc.type === 'doc' && doc.content?.length) {
      return walkNodes(doc.content);
    }

    if (doc.content?.length) {
      return walkNodes(doc.content);
    }
  }

  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainTextToContent(text: string): Record<string, unknown> {
  const lines = text.split('\n');
  const paragraphs =
    lines.length > 0
      ? lines.map((line) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: line || ' ' }],
        }))
      : [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }];

  return { type: 'doc', content: paragraphs };
}

export function contentToHtmlFallback(content: Record<string, unknown>): string {
  const text = extractPlainTextFromContent(content);
  if (!text.trim()) return '<p></p>';
  return text
    .split('\n')
    .map((line) =>
      `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
    )
    .join('');
}

export function getRichTextDisplayText(data: RichTextBlockData): string {
  return extractPlainTextFromContent(data.content);
}
