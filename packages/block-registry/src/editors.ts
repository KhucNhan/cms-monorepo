/**
 * @cms/block-registry/editors
 *
 * Entry point RIÊNG cho admin-web VÀ apps/web (2 app frontend cần Editor UI).
 *
 * ⚠️ admin-api KHÔNG BAO GIỜ được import file này (hay bất kỳ thứ gì nó export ra) —
 * đây là nơi DUY NHẤT trong package này có import React/.tsx. admin-api phải luôn
 * import qua '@cms/block-registry/schema-only', hoàn toàn không đụng tới file này
 * hay các Editor.tsx bên dưới.
 *
 * Vì sao tách riêng khỏi registry.ts / index.ts chính: registry.ts (import bởi
 * schema-only.ts) trước đây từng vô tình kéo Editor.tsx vào theo chuỗi
 * schema-only.ts → registry.ts → blocks/*\/index.ts → Editor.tsx, làm `admin-api`
 * build lỗi (tsc báo "--jsx is not set") vì NestJS tsconfig không bật jsx. Giữ
 * Editor tách hẳn ở file này đảm bảo registry.ts / blocks/*\/index.ts / schema-only.ts
 * mãi mãi "sạch React", bất kể ai import root index.ts hay registry.ts sau này.
 */

import { HeroEditor } from './blocks/hero/Editor';
import { FaqEditor } from './blocks/faq/Editor';
import { RichTextEditor } from './blocks/rich-text/Editor';
import { JsonFallbackEditor } from './shared/JsonFallbackEditor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const blockEditors: Record<string, any> = {
  hero: HeroEditor,
  'rich-text': RichTextEditor,
  faq: FaqEditor,
};

/**
 * Lấy Editor component dùng chung cho 1 block type. Trả về `undefined` nếu type
 * không có Editor đăng ký (caller nên fallback về JsonFallbackEditor trong trường hợp đó).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBlockEditor(type: string): any {
  return blockEditors[type];
}

export { JsonFallbackEditor, HeroEditor, FaqEditor, RichTextEditor };
