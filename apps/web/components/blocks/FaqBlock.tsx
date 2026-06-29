'use client';

import { useState } from 'react';
import type { FaqBlockData, FaqItem } from '@/types';

interface Props {
  data: FaqBlockData;
}

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-gray-900 font-medium hover:text-gray-600 transition-colors"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{item.question}</span>
        <span
          aria-hidden
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? '400px' : '0px' }}
      >
        <p className="pb-4 text-gray-600 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

export function FaqBlock({ data }: Props) {
  const { heading, items, allowMultipleOpen } = data;
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!allowMultipleOpen) next.clear();
        next.add(index);
      }
      return next;
    });
  }

  return (
    <section className="w-full px-6 py-16 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-10">{heading}</h2>
      <div className="border-t border-gray-200">
        {items.map((item, i) => (
          <FaqRow
            key={i}
            item={item}
            open={openSet.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
    </section>
  );
}
