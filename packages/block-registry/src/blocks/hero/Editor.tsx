import type { BlockEditorProps } from '../../types';
import type { HeroData } from './schema';

/**
 * Hero Block Editor — Shared between admin-web and apps/web.
 *
 * Host app owns the media picker. This editor only renders UI and
 * calls onOpenMediaPicker() when the user wants to choose/change an image.
 */
export function HeroEditor({
  value,
  onChange,
  onOpenMediaPicker,
}: BlockEditorProps<HeroData>) {
  const title = value.title ?? '';
  const subtitle = value.subtitle ?? '';
  const buttonText = value.buttonText ?? '';
  const buttonHref = value.buttonHref ?? '';
  const alignment = value.alignment ?? 'center';
  const overlayOpacity = value.overlayOpacity ?? 40;

  const image = value.image ?? {
    mediaId: '',
    alt: '',
  };

  const previewUrl = image.url ?? null;
  const hasImage = Boolean(image.mediaId && previewUrl);

  const handleRemoveImage = () => {
    onChange({
      ...value,
      image: {
        mediaId: '',
        alt: '',
        url: undefined,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
      {/* Hero title */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Hero Title
        </label>

        <input
          type="text"
          value={title}
          onChange={(e) =>
            onChange({
              ...value,
              title: e.target.value,
            })
          }
          className="rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
        />
      </div>

      {/* Subtitle */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Hero Subtitle
        </label>

        <input
          type="text"
          value={subtitle}
          onChange={(e) =>
            onChange({
              ...value,
              subtitle: e.target.value,
            })
          }
          className="rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
        />
      </div>

      {/* Button text */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Button Text
        </label>

        <input
          type="text"
          value={buttonText}
          onChange={(e) =>
            onChange({
              ...value,
              buttonText: e.target.value,
            })
          }
          className="rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
        />
      </div>

      {/* Button href */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Button Link (Href)
        </label>

        <input
          type="text"
          value={buttonHref}
          onChange={(e) =>
            onChange({
              ...value,
              buttonHref: e.target.value,
            })
          }
          className="rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
          placeholder="https://example.com or leaving empty"
        />
      </div>

      {/* Alignment */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Alignment
        </label>

        <select
          value={alignment}
          onChange={(e) =>
            onChange({
              ...value,
              alignment: e.target.value as HeroData['alignment'],
            })
          }
          className="rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Overlay */}
      <div className="flex flex-col gap-xs">
        <label className="text-label-md font-bold text-on-surface">
          Overlay Opacity (%)
        </label>

        <input
          type="number"
          min={0}
          max={100}
          value={overlayOpacity}
          onChange={(e) =>
            onChange({
              ...value,
              overlayOpacity: Number(e.target.value),
            })
          }
          className="rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
        />
      </div>
            {/* Hero Image */}
      <div className="md:col-span-2 flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <span className="text-label-md font-bold text-on-surface">
          Hero Image
        </span>

        {hasImage ? (
          <div className="flex flex-col items-start gap-md sm:flex-row">
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container sm:w-48">
              <img
                src={previewUrl!}
                alt={image.alt || 'Hero preview'}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>

            <div className="flex flex-1 flex-col gap-sm">
              <p className="truncate font-mono text-label-sm text-on-surface-variant">
                {image.mediaId}
              </p>

              <div className="flex flex-wrap gap-sm">
                <button
                  type="button"
                  onClick={onOpenMediaPicker}
                  className="inline-flex items-center gap-xs rounded-lg bg-primary px-3 py-2 text-body-md font-medium text-on-primary transition-opacity hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    photo_library
                  </span>
                  Change Image
                </button>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-xs rounded-lg border border-outline-variant px-3 py-2 text-body-md transition-colors hover:bg-error/10 hover:text-error"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete
                  </span>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant p-lg">
            <span className="material-symbols-outlined mb-sm text-[32px] text-outline-variant">
              image
            </span>

            <p className="mb-md text-body-md text-on-surface-variant">
              No image selected
            </p>

            <button
              type="button"
              onClick={onOpenMediaPicker}
              className="inline-flex items-center gap-xs rounded-lg bg-primary px-3 py-2 text-body-md font-medium text-on-primary transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">
                add_photo_alternate
              </span>
              Add Image
            </button>
          </div>
        )}

        {/* Alt text */}
        <div className="flex flex-col gap-xs">
          <label className="text-label-sm text-on-surface-variant">
            Alt Text
          </label>

          <input
            type="text"
            value={image.alt ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                image: {
                  ...image,
                  alt: e.target.value,
                },
              })
            }
            className="rounded-lg border border-outline-variant bg-surface px-sm py-1.5 text-body-md outline-none focus:border-primary"
            placeholder="Describe the image for accessibility"
          />
        </div>
      </div>
    </div>
  );
}