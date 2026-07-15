import type { BlockEditorProps } from '../../types';
import type { FaqData, FaqItem } from './schema';

/**
 * FAQ Block Editor — Shared between admin-web and apps/web.
 * `variant`:
 * - 'admin' (mặc định): layout 2 cột như cũ.
 * - 'web': 1 cột dọc, input/text nhỏ hơn (dùng khi render trong apps/web edit-mode).
 */
export function FaqEditor({
  value,
  onChange,
  variant = 'admin',
}: BlockEditorProps<FaqData>) {
  const isWeb = variant === 'web';

  const heading = value.heading ?? '';
  const allowMultipleOpen = value.allowMultipleOpen ?? false;
  const items: FaqItem[] = value.items ?? [];

  const handleItemChange = (
    idx: number,
    field: 'question' | 'answer',
    val: string,
  ) => {
    const updatedItems = [...items];
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: val,
    } as FaqItem;

    onChange({
      ...value,
      items: updatedItems,
    });
  };

  const handleAddItem = () => {
    onChange({
      ...value,
      items: [
        ...items,
        {
          question: 'New Question',
          answer: 'New Answer',
        },
      ],
    });
  };

  const handleRemoveItem = (idx: number) => {
    onChange({
      ...value,
      items: items.filter((_, i) => i !== idx),
    });
  };

  // Kích thước & spacing scale theo variant
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

  return (
    <div className={isWeb ? 'flex flex-col gap-sm' : 'flex flex-col gap-md'}>
      <div
        className={
          isWeb
            ? 'flex flex-col gap-sm'
            : 'grid grid-cols-1 items-end gap-md md:grid-cols-2'
        }
      >
        <div className="flex flex-col gap-xs">
          <label className={labelCls}>FAQ Heading</label>

          <input
            type="text"
            value={heading}
            onChange={(e) =>
              onChange({
                ...value,
                heading: e.target.value,
              })
            }
            className={inputCls}
          />
        </div>

        <div
          className={
            isWeb
              ? 'flex h-8 select-none items-center gap-xs'
              : 'flex h-10 select-none items-center gap-sm'
          }
        >
          <input
            type="checkbox"
            id={`allowMultipleOpen-${heading}`}
            checked={allowMultipleOpen}
            onChange={(e) =>
              onChange({
                ...value,
                allowMultipleOpen: e.target.checked,
              })
            }
            className={
              isWeb
                ? 'h-3.5 w-3.5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary'
                : 'h-4 w-4 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary'
            }
          />

          <label
            htmlFor={`allowMultipleOpen-${heading}`}
            className={
              isWeb
                ? 'pl-2 cursor-pointer text-body-sm font-medium text-on-surface'
                : 'cursor-pointer text-body-md font-medium text-on-surface'
            }
          >
            Allow multiple FAQs open at once
          </label>
        </div>
      </div>

      <div className={isWeb ? 'mt-xs space-y-xs' : 'mt-sm space-y-sm'}>
        <span className={labelCls}>
          Questions &amp; Answers ({items.length})
        </span>

        <div
          className={
            isWeb
              ? 'space-y-sm p-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-sm'
              : 'space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md'
          }
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              className={
                isWeb
                  ? 'flex flex-col gap-xs border-b border-outline-variant pb-sm last:border-b-0 last:pb-0'
                  : 'flex gap-md border-b border-outline-variant pb-md last:border-b-0 last:pb-0'
              }
            >
              <div
                className={
                  isWeb
                    ? 'flex flex-col gap-sm'
                    : 'grid flex-1 grid-cols-1 gap-sm'
                }
              >
                <div className="flex flex-col gap-xs">
                  <label className={smallLabelCls}>
                    Question {idx + 1}
                  </label>

                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) =>
                      handleItemChange(idx, 'question', e.target.value)
                    }
                    className={smallInputCls}
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className={smallLabelCls}>
                    Answer {idx + 1}
                  </label>

                  <textarea
                    rows={isWeb ? 2 : 2}
                    value={item.answer}
                    onChange={(e) =>
                      handleItemChange(idx, 'answer', e.target.value)
                    }
                    className={smallInputCls}
                  />
                </div>
              </div>

              <div className={isWeb ? 'flex justify-end' : 'flex items-center'}>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className={
                    isWeb
                      ? 'flex h-8 w-8 items-center justify-center rounded-md p-1.5 text-on-surface-variant transition-all hover:bg-error/10 hover:text-error'
                      : 'flex h-10 w-10 items-center justify-center rounded-lg p-2 text-on-surface-variant transition-all hover:bg-error/10 hover:text-error'
                  }
                  title="Remove Question"
                >
                  <span
                    className={`material-symbols-outlined ${isWeb ? 'text-[16px]' : 'text-[20px]'}`}
                  >
                    delete
                  </span>
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className={
              isWeb
                ? 'flex w-full cursor-pointer items-center justify-center gap-xs rounded-md border border-dashed border-outline-variant bg-surface py-1.5 text-body-sm font-bold transition-all hover:border-primary hover:bg-primary/5 hover:text-primary'
                : 'flex w-full cursor-pointer items-center justify-center gap-xs rounded-lg border border-dashed border-outline-variant bg-surface py-2 text-body-md font-bold transition-all hover:border-primary hover:bg-primary/5 hover:text-primary'
            }
          >
            <span className={`material-symbols-outlined ${isWeb ? 'text-[16px]' : 'text-[18px]'}`}>
              add
            </span>
            Add FAQ Item
          </button>
        </div>
      </div>
    </div>
  );
}