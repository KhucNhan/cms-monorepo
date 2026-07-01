import { useState, useEffect } from 'react';
import { mediaApi } from '@/api/media.api';
import type { HeroBlockData } from '@/types';

interface HeroBlockDisplayProps {
  data: HeroBlockData;
}

const ALIGNMENT_LABEL: Record<string, string> = {
  left: 'Left',
  center: 'Center',
  right: 'Right',
};

function DisplayField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <span className={`text-body-sm text-on-surface ${!value && value !== 0 ? 'italic text-on-surface-variant' : ''}`}>
        {value !== undefined && value !== null && value !== '' ? String(value) : '—'}
      </span>
    </div>
  );
}

export function HeroBlockDisplay({ data }: HeroBlockDisplayProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  const image = data.image ?? { mediaId: '', alt: '' };
  const alignment = data.alignment ?? 'center';
  const overlayOpacity = data.overlayOpacity ?? 40;

  useEffect(() => {
    if (image.url) { setResolvedUrl(image.url); return; }
    if (!image.mediaId) { setResolvedUrl(null); return; }

    let cancelled = false;
    mediaApi.getOne(image.mediaId).then((m) => {
      if (!cancelled) setResolvedUrl(m.url);
    }).catch(() => {
      if (!cancelled) setResolvedUrl(null);
    });
    return () => { cancelled = true; };
  }, [image.mediaId, image.url]);

  const displayUrl = image.url || resolvedUrl;
  const hasImage = Boolean(image.mediaId && displayUrl);

  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-2 gap-md">
        <DisplayField label="Hero Title" value={data.title} />
        <DisplayField label="Hero Subtitle" value={data.subtitle} />
        <DisplayField label="Button Text" value={data.buttonText} />
        <DisplayField label="Button Link" value={data.buttonHref} />
        <DisplayField label="Alignment" value={ALIGNMENT_LABEL[alignment] ?? alignment} />
        <DisplayField label="Overlay Opacity" value={`${overlayOpacity}%`} />
      </div>

      {/* Image */}
      <div className="border border-outline-variant rounded-lg p-md bg-surface-container-lowest flex flex-col gap-sm">
        <span className="text-label-sm text-on-surface-variant">Hero Image</span>
        {hasImage ? (
          <div className="flex gap-md items-start">
            <div className="w-40 aspect-video rounded-lg overflow-hidden border border-outline-variant bg-surface-container shrink-0">
              <img
                src={displayUrl!}
                alt={image.alt || 'Hero image'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-xs min-w-0">
              <span className="text-label-sm text-on-surface-variant">Alt Text</span>
              <span className={`text-body-sm text-on-surface ${!image.alt ? 'italic text-on-surface-variant' : ''}`}>
                {image.alt || '—'}
              </span>
              <span className="text-label-sm text-on-surface-variant font-mono truncate mt-xs">
                {image.mediaId}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-sm py-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] text-outline-variant">image_not_supported</span>
            <span className="text-body-sm italic">No image selected</span>
          </div>
        )}
      </div>
    </div>
  );
}