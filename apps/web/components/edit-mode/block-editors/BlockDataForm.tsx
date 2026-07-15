'use client';

// apps/web/components/edit-mode/block-editors/BlockDataForm.tsx
//
// Editor UI lấy từ '@cms/block-registry/editors' (subpath RIÊNG, chỉ 2 app frontend
// dùng — KHÔNG phải '@cms/block-registry' gốc, vì gốc bị admin-api import gián tiếp
// qua schema-only.ts → registry.ts).
//
// apps/web không tự resolve preview url ở đây — MediaPicker của apps/web trả
// `url` trực tiếp lúc chọn (xem components/edit-mode/MediaPicker.tsx), nên không
// cần bước getOne() như admin-web. Nếu record cũ bị strip url (mediaId nhưng
// không có url), ảnh sẽ không hiện cho tới khi user chọn lại — đây là gap đã có
// từ trước ở apps/web, không phải regression do đổi sang Editor dùng chung.

import { getBlockDefinition } from '@cms/block-registry';
import { getBlockEditor, JsonFallbackEditor } from '@cms/block-registry/editors';

interface BlockDataFormProps {
  type: string;
  data: any;
  onChange: (newData: any) => void;
  onOpenMediaPicker: () => void;
}

function normalizeBlockType(type: string): string {
  if (type === 'rich_text' || type === 'richtext') return 'rich-text';
  return type;
}

export function BlockDataForm({ type, data, onChange, onOpenMediaPicker }: BlockDataFormProps) {
  const normalizedType = normalizeBlockType(type);
  // Phòng thủ: không phụ thuộc hoàn toàn vào caller truyền sẵn object — nếu data
  // là undefined/null (block mới tạo, hoặc race condition trước khi defaultData
  // kịp populate), luôn ép về {} ở đây để Editor không bao giờ nhận value=undefined.
  const safeData = data ?? {};

  let isKnownType = false;
  try {
    getBlockDefinition(normalizedType);
    isKnownType = true;
  } catch {
    isKnownType = false;
  }

  const Editor = isKnownType ? getBlockEditor(normalizedType) : undefined;

  if (!Editor) {
    return <JsonFallbackEditor value={safeData} onChange={onChange} />;
  }

  // (BlockEditorProps trong packages/block-registry/src/types.ts) không định nghĩa
  // prop này, nên nó không có tác dụng gì (React chỉ âm thầm bỏ qua prop lạ). Nếu
  // thực sự cần phân biệt hành vi theo app (admin-web vs apps/web), phải thêm
  // `variant` vào BlockEditorProps dùng chung trước, rồi mới truyền ở đây.
  return <Editor variant="web" value={safeData} onChange={onChange} onOpenMediaPicker={onOpenMediaPicker} />;
}