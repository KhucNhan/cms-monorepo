import type { FaqBlockData, FaqItem } from '@/types';

interface FaqBlockEditorProps {
  data: FaqBlockData;
  onChange: (newData: FaqBlockData) => void;
}

export function FaqBlockEditor({ data, onChange }: FaqBlockEditorProps) {
  const heading = data.heading ?? '';
  const allowMultipleOpen = data.allowMultipleOpen ?? false;
  const items = (data.items as FaqItem[]) || [];

  const handleItemChange = (idx: number, field: 'question' | 'answer', val: string) => {
    const updatedItems = [...items];
    updatedItems[idx] = { ...updatedItems[idx], [field]: val };
    onChange({ ...data, items: updatedItems });
  };

  const handleAddItem = () => {
    const updatedItems = [...items, { question: 'New Question', answer: 'New Answer' }];
    onChange({ ...data, items: updatedItems });
  };

  const handleRemoveItem = (idx: number) => {
    const updatedItems = items.filter((_, i) => i !== idx);
    onChange({ ...data, items: updatedItems });
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-end">
        <div className="flex flex-col gap-xs">
          <label className="text-label-md font-bold text-on-surface">FAQ Heading</label>
          <input
            type="text"
            value={heading}
            onChange={(e) => onChange({ ...data, heading: e.target.value })}
            className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
          />
        </div>
        
        <div className="flex items-center gap-sm h-10 select-none">
          <input
            type="checkbox"
            id={`allowMultipleOpen-${heading}`}
            checked={allowMultipleOpen}
            onChange={(e) => onChange({ ...data, allowMultipleOpen: e.target.checked })}
            className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer"
          />
          <label htmlFor={`allowMultipleOpen-${heading}`} className="text-body-md font-medium text-on-surface cursor-pointer">
            Allow multiple FAQs open at once
          </label>
        </div>
      </div>

      {/* FAQ Items list */}
      <div className="space-y-sm mt-sm">
        <span className="text-label-md font-bold text-on-surface">Questions & Answers ({items.length})</span>
        <div className="space-y-md border border-outline-variant rounded-xl p-md bg-surface-container-lowest">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-md border-b border-outline-variant pb-md last:border-b-0 last:pb-0">
              <div className="flex-1 grid grid-cols-1 gap-sm">
                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm text-on-surface-variant">Question {idx + 1}</label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => handleItemChange(idx, 'question', e.target.value)}
                    className="bg-surface border border-outline-variant rounded-lg px-sm py-1.5 text-body-md focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm text-on-surface-variant">Answer {idx + 1}</label>
                  <textarea
                    rows={2}
                    value={item.answer}
                    onChange={(e) => handleItemChange(idx, 'answer', e.target.value)}
                    className="bg-surface border border-outline-variant rounded-lg px-sm py-1.5 text-body-md focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all h-10 w-10 flex items-center justify-center"
                  title="Remove Question"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-2 border border-dashed border-outline-variant hover:border-primary hover:text-primary rounded-lg text-body-md font-bold transition-all bg-surface hover:bg-primary/5 flex items-center justify-center gap-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add FAQ Item
          </button>
        </div>
      </div>
    </div>
  );
}
