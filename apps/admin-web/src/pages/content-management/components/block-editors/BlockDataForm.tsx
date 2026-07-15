// apps/admin-web/src/pages/content-management/components/BlockDataForm.tsx
//
// Editor UI lấy từ '@cms/block-registry/editors' (subpath RIÊNG, chỉ 2 app frontend
// dùng — KHÔNG phải '@cms/block-registry' gốc, vì gốc bị admin-api import gián tiếp
// qua schema-only.ts → registry.ts. getBlockDefinition() (metadata: label, icon,
// schema, defaultData) vẫn lấy từ '@cms/block-registry' gốc như cũ vì không chứa React.

import { useState, useEffect } from 'react';
import { getBlockDefinition } from '@cms/block-registry';
import { getBlockEditor, JsonFallbackEditor } from '@cms/block-registry/editors';
import { MediaPickerModal } from '@/pages/media-library/components/MediaPickerModal';
import { mediaApi } from '@/api/media.api';
import type { MediaItem } from '@/types';

interface BlockDataFormProps {
  type: string;
  data: any;
  onChange: (newData: any) => void;
}

function normalizeBlockType(type: string): string {
  if (type === 'rich_text' || type === 'richtext') return 'rich-text';
  return type;
}

export function BlockDataForm({ type, data, onChange }: BlockDataFormProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  const normalizedType = normalizeBlockType(type);
  const safeData = data ?? {};
  const mediaId: string | undefined = safeData?.image?.mediaId;

  // Resolve preview url từ mediaId cho hero (giữ lại hành vi cũ: ưu tiên thumbUrl,
  // vì url gốc có thể đã bị strip khi lưu — xem HeroBlockEditor cũ / MediaService).
  useEffect(() => {
    if (normalizedType !== 'hero' || !mediaId) {
      setResolvedImageUrl(null);
      return;
    }
    let cancelled = false;
    mediaApi
      .getOne(mediaId)
      .then((media) => {
        if (!cancelled) setResolvedImageUrl(media.thumbUrl ?? media.url);
      })
      .catch(() => {
        if (!cancelled) setResolvedImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedType, mediaId]);

  const handleSelectMedia = (media: MediaItem) => {
    const currentImage = safeData.image ?? {};
    onChange({
      ...safeData,
      image: {
        mediaId: media.id,
        url: media.url,
        alt: currentImage.alt || media.key.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      },
    });
    setResolvedImageUrl(media.thumbUrl ?? media.url);
    setShowPicker(false);
  };

  // Chỉ dùng getBlockDefinition() để xác nhận type hợp lệ / lấy metadata — không
  // đọc .Editor từ đây nữa, vì registry.ts không còn gán Editor (xem
  // packages/block-registry/src/blocks/*/index.ts). Editor lấy riêng qua
  // getBlockEditor() từ subpath '/editors'.
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

  // Với hero, merge resolvedImageUrl vào value.image.url trước khi truyền xuống Editor
  // dùng chung — Editor không tự resolve, chỉ hiển thị url đã có sẵn.
  const value =
    normalizedType === 'hero' && safeData?.image
      ? { ...safeData, image: { ...safeData.image, url: resolvedImageUrl ?? safeData.image.url } }
      : safeData;

  return (
    <>
      <Editor value={value} onChange={onChange} onOpenMediaPicker={() => setShowPicker(true)} />
      {showPicker && (
        <MediaPickerModal onSelect={handleSelectMedia} onCancel={() => setShowPicker(false)} />
      )}
    </>
  );
}