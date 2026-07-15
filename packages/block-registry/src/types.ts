import type { ZodSchema, z } from 'zod';

// ─────────────────────────────────────────────────────────
// Block Definition — shape mỗi block phải implement
// ─────────────────────────────────────────────────────────

/**
 * BlockDefinition<S> là contract giữa registry và ba app.
 *
 * - `schema`:      Zod schema, pure, không phụ thuộc React → NestJS import được.
 * - `defaultData`: giá trị ban đầu khi tạo block mới, phải pass schema.
 * - `Editor`:      React component dùng trong admin-web (optional — backend không cần).
 * - `Renderer`:    React component dùng trong Next.js web (optional — backend không cần).
 *
 * Import path `@cms/block-registry/schema-only` chỉ export schema + defaultData,
 * không kéo React vào môi trường Node.
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

// Props cho Editor component của mỗi block
export interface BlockEditorProps<T = Record<string, unknown>> {
  value: T;
  onChange: (next: T) => void;
  errors?: Record<string, string[]>;
  /**
   * Callback để mở media picker — do host app cung cấp.
   * Hero Editor sẽ gọi hàm này khi user click "Choose image".
   * Host app tự quyết định dùng modal nào (admin-web: MediaPickerModal,
   * apps/web: MediaPicker) và khi chọn xong sẽ gọi onChange với image mới.
   */
  onOpenMediaPicker?: () => void;
  /**
   * Host app đang render editor này là ai:
   * - 'admin' (mặc định): admin-web — giữ nguyên layout/kích thước hiện tại (grid nhiều cột).
   * - 'web': apps/web — layout dồn thành 1 cột dọc, input/text nhỏ hơn (không gian edit-mode
   *   trên trang public hẹp hơn panel admin).
   * Không truyền = coi như 'admin' để không phá vỡ code admin-web hiện có.
   */
  variant?: 'admin' | 'web';
}

// Props cho Renderer component của mỗi block
export interface BlockRendererProps<T = Record<string, unknown>> {
  data: T;
}