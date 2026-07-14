'use client';

// apps/web/components/edit-mode/block-editors/BlockDataForm.tsx
//
// Editor UI giờ lấy từ packages/block-registry (dùng chung với admin-web).
// File cũ HeroBlockEditor.tsx / FaqBlockEditor.tsx / RichTextBlockEditor.tsx /
// JsonBlockEditor.tsx / rich-text.utils.ts trong thư mục này có thể XOÁ sau khi
// xác nhận build pass — không còn được import ở đâu nữa.
//
// apps/web không tự resolve preview url ở đây — MediaPicker của apps/web trả
// `url` trực tiếp lúc chọn (xem components/edit-mode/MediaPicker.tsx), nên không
// cần bước getOne() như admin-web. Nếu record cũ bị strip url (mediaId nhưng
// không có url), ảnh sẽ không hiện cho tới khi user chọn lại — đây là gap đã có
// từ trước ở apps/web, không phải regression do đổi sang Editor dùng chung.

import { getBlockDefinition, JsonFallbackEditor } from '@cms/block-registry';

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

  let definition;
  try {
    definition = getBlockDefinition(normalizedType);
  } catch {
    definition = null;
  }

  const Editor = definition?.Editor;

  if (!Editor) {
    return <JsonFallbackEditor value={data} onChange={onChange} />;
  }

  return <Editor value={data} onChange={onChange} onOpenMediaPicker={onOpenMediaPicker} />;
}
