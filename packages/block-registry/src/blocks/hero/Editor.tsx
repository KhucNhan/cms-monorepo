import type { BlockEditorProps } from '../../types';
import type { HeroData } from './schema';

/**
 * Hero Block Editor — Shared between admin-web and apps/web.
 *
 * Host app owns the media picker. This editor only renders UI and
 * calls onOpenMediaPicker() when the user wants to choose/change an image.
 *
 * `variant`:
 * - 'admin' (mặc định): layout grid 2 cột như cũ.
 * - 'web': dồn thành 1 cột dọc, input/text nhỏ hơn (apps/web edit-mode).
 */
export function HeroEditor({
  value,
  onChange,
  onOpenMediaPicker,
  variant = 'admin',
}: BlockEditorProps<HeroData>) {
  const isWeb = variant === 'web';

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

  const labelCls = isWeb
    ? 'text-label-sm font-bold text-on-surface'
    : 'text-label-md font-bold text-on-surface';
  const inputCls = isWeb
    ? 'rounded-md pl-2 border border-outline-variant bg-surface px-xs py-1 text-body-sm outline-none focus:border-primary'
    : 'rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary';
  const smallLabelCls = isWeb
    ? 'text-[11px] text-on-surface-variant'
    : 'text-label-sm text-on-surface-variant';
  const smallInputCls = isWeb
    ? 'rounded-md pl-2 border border-outline-variant bg-surface px-xs py-1 text-body-sm outline-none focus:border-primary'
    : 'rounded-lg border border-outline-variant bg-surface px-sm py-1.5 text-body-md outline-none focus:border-primary';
  const btnPrimaryCls = isWeb
    ? 'inline-flex items-center gap-xs rounded-md bg-primary px-2 py-1.5 text-body-sm font-medium text-on-primary transition-opacity hover:opacity-90'
    : 'inline-flex items-center gap-xs rounded-lg bg-primary px-3 py-2 text-body-md font-medium text-on-primary transition-opacity hover:opacity-90';
  const btnSecondaryCls = isWeb
    ? 'inline-flex items-center gap-xs rounded-md border border-outline-variant px-2 py-1.5 text-body-sm transition-colors hover:bg-error/10 hover:text-error'
    : 'inline-flex items-center gap-xs rounded-lg border border-outline-variant px-3 py-2 text-body-md transition-colors hover:bg-error/10 hover:text-error';

  return (
    <div
      className={
        isWeb
          ? 'flex flex-col gap-sm'
          : 'grid grid-cols-1 gap-md md:grid-cols-2'
      }
    >
      {/* Hero title */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Hero Title</label>

        <input
          type="text"
          value={title}
          onChange={(e) =>
            onChange({
              ...value,
              title: e.target.value,
            })
          }
          className={inputCls}
        />
      </div>

      {/* Subtitle */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Hero Subtitle</label>

        <input
          type="text"
          value={subtitle}
          onChange={(e) =>
            onChange({
              ...value,
              subtitle: e.target.value,
            })
          }
          className={inputCls}
        />
      </div>

      {/* Button text */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Button Text</label>

        <input
          type="text"
          value={buttonText}
          onChange={(e) =>
            onChange({
              ...value,
              buttonText: e.target.value,
            })
          }
          className={inputCls}
        />
      </div>

      {/* Button href */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Button Link (Href)</label>

        <input
          type="text"
          value={buttonHref}
          onChange={(e) =>
            onChange({
              ...value,
              buttonHref: e.target.value,
            })
          }
          className={inputCls}
          placeholder="https://example.com or leaving empty"
        />
      </div>

      {/* Alignment */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Alignment</label>

        <select
          value={alignment}
          onChange={(e) =>
            onChange({
              ...value,
              alignment: e.target.value as HeroData['alignment'],
            })
          }
          className={inputCls}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Overlay */}
      <div className="flex flex-col gap-xs">
        <label className={labelCls}>Overlay Opacity (%)</label>

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
          className={inputCls}
        />
      </div>

      {/* Hero Image */}
      <div
        className={
          isWeb
            ? 'flex flex-col gap-xs rounded-md border border-outline-variant bg-surface-container-lowest p-sm'
            : 'md:col-span-2 flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md'
        }
      >
        <span className={labelCls}>Hero Image</span>

        {hasImage ? (
          <div
            className={
              isWeb
                ? 'flex flex-col items-start gap-sm'
                : 'flex flex-col items-start gap-md sm:flex-row'
            }
          >
            <div
              className={
                isWeb
                  ? 'aspect-video w-full overflow-hidden rounded-md border border-outline-variant bg-surface-container'
                  : 'aspect-video w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container sm:w-48'
              }
            >
              <img
                src={previewUrl!}
                alt={image.alt || 'Hero preview'}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>

            <div className="flex flex-1 flex-col gap-xs">
              <p
                className={
                  isWeb
                    ? 'truncate font-mono text-[10px] text-on-surface-variant'
                    : 'truncate font-mono text-label-sm text-on-surface-variant'
                }
              >
                {image.mediaId}
              </p>

              <div className="flex flex-wrap gap-xs">
                <button type="button" onClick={onOpenMediaPicker} className={btnPrimaryCls}>
                  <span
                    className={`material-symbols-outlined ${isWeb ? 'text-[16px]' : 'text-[18px]'}`}
                  >
                    photo_library
                  </span>
                  Change Image
                </button>

                <button type="button" onClick={handleRemoveImage} className={btnSecondaryCls}>
                  <span
                    className={`material-symbols-outlined ${isWeb ? 'text-[16px]' : 'text-[18px]'}`}
                  >
                    delete
                  </span>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={
              isWeb
                ? 'flex flex-col items-center justify-center rounded-md border-2 border-dashed border-outline-variant p-md'
                : 'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant p-lg'
            }
          >
            <span
              className={`material-symbols-outlined mb-xs text-outline-variant ${isWeb ? 'text-[24px]' : 'text-[32px]'}`}
            >
              image
            </span>

            <p className={isWeb ? 'mb-sm text-body-sm text-on-surface-variant' : 'mb-md text-body-md text-on-surface-variant'}>
              No image selected
            </p>

            <button type="button" onClick={onOpenMediaPicker} className={btnPrimaryCls}>
              <span
                className={`material-symbols-outlined ${isWeb ? 'text-[16px]' : 'text-[18px]'}`}
              >
                add_photo_alternate
              </span>
              Add Image
            </button>
          </div>
        )}

        {/* Alt text */}
        <div className="flex flex-col gap-xs">
          <label className={smallLabelCls}>Alt Text</label>

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
            className={smallInputCls}
            placeholder="Describe the image for accessibility"
          />
        </div>
      </div>
    </div>
  );
}