'use client';

import { useState } from 'react';
import { getAllBlockDefinitions } from '@cms/block-registry';

interface BlockPickerModalProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function BlockPickerModal({ onSelect, onClose }: BlockPickerModalProps) {
  const definitions = getAllBlockDefinitions();
  const [search, setSearch] = useState('');
  const [previewType, setPreviewType] = useState<string | null>(definitions[0]?.type ?? null);

  const filtered = definitions.filter((def) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return def.label.toLowerCase().includes(q) || def.type.toLowerCase().includes(q);
  });

  const previewDef = definitions.find((d) => d.type === previewType);

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50">
      <div className="flex h-[600px] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Select a block</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="border-b px-4 py-3">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-1 gap-3 overflow-hidden p-4">
          <div className="grid w-1/2 grid-cols-2 content-start gap-2 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="col-span-2 py-8 text-center text-xs text-gray-400">
                Can't find any blocks matching "{search}"
              </p>
            ) : (
              filtered.map((def) => (
                <div
                  key={def.type}
                  onClick={() => setPreviewType(def.type)}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all ${
                    previewType === def.type
                      ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-indigo-100">
                    {def.thumbnail ? (
                      <img src={def.thumbnail} alt={def.label} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-indigo-600">{def.label[0]}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium">{def.label}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(def.type);
                    }}
                    className="rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-indigo-500"
                  >
                    Select
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex w-1/2 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
            {previewDef?.thumbnail ? (
              <img src={previewDef.thumbnail} alt={previewDef.label} className="h-full w-full object-contain" />
            ) : (
              <p className="px-4 text-center text-xs text-gray-400">Select a block to preview it here</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}