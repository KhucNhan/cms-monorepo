import type { ZodSchema, z } from 'zod';

// ─────────────────────────────────────────────────────────
// Block Definition — shape mỗi block phải implement
// ─────────────────────────────────────────────────────────

/**
 * BlockDefinition<S> là contract giữa registry và ba app.
 *
 * - `schema`:      Zod schema, pure, không phụ thuộc React → NestJS import được.
 * - `defaultData`: giá trị ban đầu khi tạo block mới, phải pass schema.
 * - `Editor`:      React component DÙNG CHUNG cho admin-web VÀ apps/web (Live Edit Mode).
 *                  Phải là React thuần + Tailwind class phổ quát — KHÔNG được import
 *                  class-variance-authority, radix-ui, hay bất kỳ token màu riêng của
 *                  admin-web (bg-surface, text-on-surface, ...) vì apps/web không có
 *                  các token đó. Vi phạm điều này sẽ làm UI vỡ ở apps/web.
 * - `Renderer`:    React component dùng trong Next.js web (optional — backend không cần).
 *
 * ⚠️ QUAN TRỌNG: `admin-api` (NestJS, Node thuần) KHÔNG BAO GIỜ được import package này
 * qua đường dẫn gốc (`@cms/block-registry`) — vì file này (`blocks/index.ts`) giờ có
 * import React (Editor.tsx). admin-api phải luôn import qua
 * @cms/block-registry/schema-only, chỉ export schema + defaultData, không kéo
 * React vào runtime Node. Nếu thấy admin-api import trực tiếp từ gốc package này,
 * đó là lỗi kiến trúc cần sửa ngay, không phải việc bình thường.
 */
export interface BlockDefinition<S extends ZodSchema = ZodSchema> {
  type: string;
  label: string;
  icon: string; // tên icon (Lucide), admin-web resolve component
  schema: S;
  defaultData: z.infer<S>;
  thumbnail?: string;
  // Editor và Renderer được khai báo là `any` ở đây để tránh
  // import React types vào package schema-only.
  // Từng app tự cast về đúng component type khi dùng.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer?: any;
}

// Props cho Editor component của mỗi block — DÙNG CHUNG giữa admin-web và apps/web.
export interface BlockEditorProps<T = Record<string, unknown>> {
  value: T;
  onChange: (next: T) => void;
  errors?: Record<string, string[]>;
  /**
   * Optional: chỉ block nào cần chọn ảnh (hiện tại: hero) mới dùng field này.
   * Editor KHÔNG tự mở modal chọn media — mỗi app (admin-web / apps/web) có data-layer
   * và modal picker riêng (mediaApi + React state vs raw fetch), nên Editor chỉ gọi
   * callback này để app cha tự mở picker của mình rồi trả kết quả qua `onChange`.
   */
  onOpenMediaPicker?: () => void;
  variant?: 'admin' | 'web';
}

// Props cho Renderer component của mỗi block
export interface BlockRendererProps<T = Record<string, unknown>> {
  data: T;
}
