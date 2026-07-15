/**
 * Shared rich-text utilities for ProseMirror / TipTap JSON ↔ plain text conversion.
 * Used by both admin-web and apps/web via block-registry.
 * NO React imports here — pure TypeScript.
 */
import type { RichTextData } from './schema';

type ProseMirrorNode = {
  type?: string;
  text?: string;
  content?: ProseMirrorNode[];
};

/**
 * Đi bộ các node INLINE (text / hardBreak) nằm bên trong CÙNG MỘT paragraph —
 * nối bằng '' vì chúng thuộc cùng 1 dòng (hardBreak tự chèn '\n' của riêng nó
 * khi xuống dòng mềm trong 1 paragraph).
 */
function walkInline(nodes: ProseMirrorNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.text ?? '';
      if (node.type === 'hardBreak') return '\n';
      if (node.content?.length) return walkInline(node.content);
      return '';
    })
    .join('');
}

/**
 * Đi bộ các node BLOCK (paragraph, ...) ở cấp doc.content — PHẢI nối bằng '\n'
 * giữa các paragraph, khác với walkInline. Đây chính là chỗ bug cũ: dùng chung
 * 1 hàm walkNodes join('') cho cả 2 cấp khiến 2 paragraph liên tiếp bị dính
 * làm một, làm mất newline người dùng vừa gõ ngay khi textarea re-render.
 */
function walkBlocks(nodes: ProseMirrorNode[]): string {
  return nodes
    .map((node) => {
      const line = node.content?.length ? walkInline(node.content) : '';
      // plainTextToContent() dùng ' ' làm placeholder cho dòng trống (để paragraph
      // không rỗng, tránh vài schema ProseMirror/TipTap từ chối empty paragraph).
      // Khi hiển thị lại, coi placeholder này là dòng trống thật để textarea trông
      // tự nhiên như người dùng đã gõ, thay vì lộ ra 1 khoảng trắng lạ mỗi dòng trống.
      return line === ' ' ? '' : line;
    })
    .join('\n');
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
    return walkBlocks(raw as ProseMirrorNode[]);
  }

  if (typeof raw === 'object') {
    const doc = raw as ProseMirrorNode & Record<string, unknown>;

    if (typeof doc.text === 'string') {
      return doc.text;
    }

    if (doc.type === 'doc' && doc.content?.length) {
      return walkBlocks(doc.content);
    }

    if (doc.content?.length) {
      return walkBlocks(doc.content);
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
    .map(
      (line) =>
        `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
    )
    .join('');
}

export function getRichTextDisplayText(data: RichTextData): string {
  return extractPlainTextFromContent(data.content);
}