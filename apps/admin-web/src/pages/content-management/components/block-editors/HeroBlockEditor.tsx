import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaPickerModal } from '@/pages/media-library/components/MediaPickerModal';
import { mediaApi } from '@/api/media.api';
import type { HeroBlockData, MediaItem } from '@/types';

interface HeroBlockEditorProps {
  data: HeroBlockData;
  onChange: (newData: HeroBlockData) => void;
}

export function HeroBlockEditor({ data, onChange }: HeroBlockEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  // Preview trong editor chỉ cần variant "thumb" (cap 400px, ≤100KB), không cần tải bản
  // "original" full-size — nhẹ hơn đáng kể cho khung preview nhỏ (w-48 aspect-video).
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string | null>(null);

  const title = data.title ?? '';
  const subtitle = data.subtitle ?? '';
  const buttonText = data.buttonText ?? '';
  const buttonHref = data.buttonHref ?? '';
  const alignment = data.alignment ?? 'center';
  const overlayOpacity = data.overlayOpacity ?? 40;
  const image = data.image ?? { mediaId: '', alt: '' };

  // Resolve preview URL từ mediaId khi url đã bị strip lúc save (legacy records — xem
  // MediaService.stripMediaReference()). Ưu tiên thumbUrl cho preview, fallback về url gốc
  // nếu record cũ chưa có thumbUrl (upload trước khi có tính năng Media Optimization).
  useEffect(() => {
    if (!image.mediaId) {
      setResolvedPreviewUrl(null);
      return;
    }

    let cancelled = false;
    mediaApi
      .getOne(image.mediaId)
      .then((media) => {
        if (!cancelled) setResolvedPreviewUrl(media.thumbUrl ?? media.url);
      })
      .catch(() => {
        if (!cancelled) setResolvedPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [image.mediaId]);

  const displayUrl = resolvedPreviewUrl;
  const hasImage = Boolean(image.mediaId && displayUrl);

  const handleSelectMedia = (media: MediaItem) => {
    onChange({
      ...data,
      image: {
        mediaId: media.id,
        url: media.url,
        alt: image.alt || media.key.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      },
    });
    // Cập nhật preview ngay từ media vừa chọn, không cần đợi round-trip getOne().
    setResolvedPreviewUrl(media.thumbUrl ?? media.url);
    setShowPicker(false);
  };

  const handleRemoveImage = () => {
    onChange({ ...data, image: { mediaId: '', alt: '', url: undefined } });
    setResolvedPreviewUrl(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">Hero Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">Hero Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
            className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">Button Text</label>
          <input
            type="text"
            value={buttonText}
            onChange={(e) => onChange({ ...data, buttonText: e.target.value })}
            className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">Button Link (Href)</label>
          <input
            type="text"
            value={buttonHref}
            onChange={(e) => onChange({ ...data, buttonHref: e.target.value })}
            className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
            placeholder="https://example.com or leaving empty"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">Alignment</label>
          <Select
            value={alignment}
            onValueChange={(value) => onChange({ ...data, alignment: value as 'left' | 'center' | 'right' })}
          >
            <SelectTrigger className="bg-surface border-outline-variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface text-on-surface border border-outline-variant">
              <SelectGroup>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">Overlay Opacity (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={overlayOpacity}
            onChange={(e) => onChange({ ...data, overlayOpacity: Number(e.target.value) })}
            className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
          />
        </div>

        <div className="md:col-span-2 border border-outline-variant rounded-lg p-md bg-surface-container-lowest flex flex-col gap-sm">
          <span className="text-label-md font-bold text-on-surface">Hero Image</span>

          {hasImage ? (
            <div className="flex flex-col sm:flex-row gap-md items-start">
              <div className="w-full sm:w-48 aspect-video rounded-lg overflow-hidden border border-outline-variant bg-surface-container">
                <img
                  src={displayUrl!}
                  alt={image.alt || 'Hero preview'}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 flex flex-col gap-sm">
                <p className="text-label-sm text-on-surface-variant font-mono truncate">
                  {image.mediaId}
                </p>
                <div className="flex flex-wrap gap-sm">
                  <Button variant="secondary" icon="photo_library" size="sm" onClick={() => setShowPicker(true)}>
                    Change Image
                  </Button>
                  <Button variant="ghost" icon="delete" size="sm" onClick={handleRemoveImage}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-lg border-2 border-dashed border-outline-variant rounded-lg">
              <span className="material-symbols-outlined text-[32px] text-outline-variant mb-sm">image</span>
              <p className="text-body-md text-on-surface-variant mb-md">No image selected</p>
              <Button variant="primary" icon="add_photo_alternate" size="sm" onClick={() => setShowPicker(true)}>
                Add Image
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <label className="text-label-sm text-on-surface-variant">Alt Text</label>
            <input
              type="text"
              value={image.alt ?? ''}
              onChange={(e) => onChange({ ...data, image: { ...image, alt: e.target.value } })}
              className="bg-surface border border-outline-variant rounded-lg px-sm py-1.5 text-body-md focus:border-primary outline-none"
              placeholder="Describe the image for accessibility"
            />
          </div>
        </div>
      </div>

      {showPicker && (
        <MediaPickerModal
          onSelect={handleSelectMedia}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </>
  );
}