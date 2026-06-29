import { z } from 'zod';

/**
 * RichText block lưu content dưới dạng JSON (TipTap / ProseMirror doc format).
 * Không lưu HTML string để tránh XSS và để renderer quyết định cách render.
 *
 * `htmlFallback` là string được sanitize, dùng để Next.js render
 * mà không cần bundle toàn bộ TipTap vào public site.
 * Được generate tự động bởi editor khi save — editor không cần điền tay.
 */
export const richTextSchema = z.object({
  /** ProseMirror JSON document — output từ TipTap editor */
  content: z.record(z.unknown()),

  /**
   * Pre-rendered HTML (sanitized) — generated từ content khi save.
   * Next.js dùng cái này để render nhanh mà không cần TipTap runtime.
   */
  htmlFallback: z.string(),

  /** Text alignment cho toàn block */
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
});

export type RichTextData = z.infer<typeof richTextSchema>;
