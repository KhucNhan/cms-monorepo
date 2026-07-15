// apps/admin-web/src/pages/content-management/components/BlockDataForm.tsx
//
// Editor UI giờ lấy từ packages/block-registry (dùng chung với apps/web).
// File cũ HeroBlockEditor.tsx / FaqBlockEditor.tsx / RichTextBlockEditor.tsx /
// JsonBlockEditor.tsx trong thư mục block-editors/ có thể XOÁ sau khi xác nhận
// build pass — không còn được import ở đâu nữa.
//
// Media picker: hero cần onOpenMediaPicker, admin-web tự quản lý modal
// (MediaPickerModal + mediaApi) — khác biệt so với apps/web ở tầng data,
// nhưng Editor dùng chung không quan tâm việc đó.

import { useState, useEffect } from 'react';
import { getBlockDefinition, JsonFallbackEditor } from '@cms/block-registry';
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
  const mediaId: string | undefined = data?.image?.mediaId;

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
    const currentImage = data.image ?? {};
    onChange({
      ...data,
      image: {
        mediaId: media.id,
        url: media.url,
        alt: currentImage.alt || media.key.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      },
    });
    setResolvedImageUrl(media.thumbUrl ?? media.url);
    setShowPicker(false);
  };

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

  // Với hero, merge resolvedImageUrl vào value.image.url trước khi truyền xuống Editor
  // dùng chung — Editor không tự resolve, chỉ hiển thị url đã có sẵn.
  const value =
    normalizedType === 'hero' && data?.image
      ? { ...data, image: { ...data.image, url: resolvedImageUrl ?? data.image.url } }
      : data;

  return (
    <>
      <Editor value={value} onChange={onChange} onOpenMediaPicker={() => setShowPicker(true)} />
      {showPicker && (
        <MediaPickerModal onSelect={handleSelectMedia} onCancel={() => setShowPicker(false)} />
      )}
    </>
  );
}
