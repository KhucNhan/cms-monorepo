import type { BlockEditorProps } from '../../types';
import type { FaqData, FaqItem } from './schema';

/**
 * FAQ Block Editor — Shared between admin-web and apps/web.
 * UI kept identical to the previous admin-web implementation.
 */
export function FaqEditor({ value, onChange }: BlockEditorProps<FaqData>) {
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

  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-1 items-end gap-md md:grid-cols-2">
        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">
            FAQ Heading
          </label>

          <input
            type="text"
            value={heading}
            onChange={(e) =>
              onChange({
                ...value,
                heading: e.target.value,
              })
            }
            className="rounded-lg border border-outline-variant bg-surface px-sm py-2 text-body-md outline-none focus:border-primary"
          />
        </div>

        <div className="flex h-10 select-none items-center gap-sm">
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
            className="h-4 w-4 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
          />

          <label
            htmlFor={`allowMultipleOpen-${heading}`}
            className="cursor-pointer text-body-md font-medium text-on-surface"
          >
            Allow multiple FAQs open at once
          </label>
        </div>
      </div>

      <div className="mt-sm space-y-sm">
        <span className="text-label-md font-bold text-on-surface">
          Questions &amp; Answers ({items.length})
        </span>

        <div className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex gap-md border-b border-outline-variant pb-md last:border-b-0 last:pb-0"
            >
              <div className="grid flex-1 grid-cols-1 gap-sm">
                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm text-on-surface-variant">
                    Question {idx + 1}
                  </label>

                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) =>
                      handleItemChange(idx, 'question', e.target.value)
                    }
                    className="rounded-lg border border-outline-variant bg-surface px-sm py-1.5 text-body-md outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm text-on-surface-variant">
                    Answer {idx + 1}
                  </label>

                  <textarea
                    rows={2}
                    value={item.answer}
                    onChange={(e) =>
                      handleItemChange(idx, 'answer', e.target.value)
                    }
                    className="rounded-lg border border-outline-variant bg-surface px-sm py-1.5 text-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg p-2 text-on-surface-variant transition-all hover:bg-error/10 hover:text-error"
                  title="Remove Question"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    delete
                  </span>
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="flex w-full cursor-pointer items-center justify-center gap-xs rounded-lg border border-dashed border-outline-variant bg-surface py-2 text-body-md font-bold transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">
              add
            </span>
            Add FAQ Item
          </button>
        </div>
      </div>
    </div>
  );
}