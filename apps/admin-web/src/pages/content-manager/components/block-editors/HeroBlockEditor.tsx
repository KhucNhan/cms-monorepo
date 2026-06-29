import type { HeroBlockData } from '@/types';

interface HeroBlockEditorProps {
  data: HeroBlockData;
  onChange: (newData: HeroBlockData) => void;
}

export function HeroBlockEditor({ data, onChange }: HeroBlockEditorProps) {
  const title = data.title ?? '';
  const subtitle = data.subtitle ?? '';
  const buttonText = data.buttonText ?? '';
  const buttonHref = data.buttonHref ?? '';
  const alignment = data.alignment ?? 'center';
  const overlayOpacity = data.overlayOpacity ?? 40;
  const image = data.image ?? { mediaId: '', alt: '' };

  return (
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
        <select
          value={alignment}
          onChange={(e) => onChange({ ...data, alignment: e.target.value as 'left' | 'center' | 'right' })}
          className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
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

      {/* Image config */}
      <div className="md:col-span-2 border border-outline-variant rounded-lg p-md bg-surface-container-lowest flex flex-col gap-sm">
        <span className="text-label-md font-bold text-on-surface">Hero Image Config</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          <div className="flex flex-col gap-xs">
            <label className="text-label-sm text-on-surface-variant">Media ID / URL</label>
            <input
              type="text"
              value={image.mediaId ?? ''}
              onChange={(e) => onChange({ ...data, image: { ...image, mediaId: e.target.value } })}
              className="bg-surface border border-outline-variant rounded-lg px-sm py-1.5 text-body-md focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-label-sm text-on-surface-variant">Alt Text</label>
            <input
              type="text"
              value={image.alt ?? ''}
              onChange={(e) => onChange({ ...data, image: { ...image, alt: e.target.value } })}
              className="bg-surface border border-outline-variant rounded-lg px-sm py-1.5 text-body-md focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
