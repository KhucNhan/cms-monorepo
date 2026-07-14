import React, { useState, useEffect } from 'react';
import type { BlockEditorProps } from '../types';

/**
 * Fallback JSON editor — hiển thị raw JSON, dùng cho các block chưa có Editor riêng.
 * Dùng chung cho admin-web và apps/web.
 */
export function JsonFallbackEditor({ value, onChange }: BlockEditorProps) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  // Sync raw khi value thay đổi từ bên ngoài
  useEffect(() => {
    setRaw(JSON.stringify(value, null, 2));
    setParseError(null);
  }, [value]);

  const handleChange = (text: string) => {
    setRaw(text);
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      setParseError(null);
      onChange(parsed);
    } catch {
      setParseError('Invalid JSON');
    }
  };

  return (
    <div className="space-y-1.5 text-sm">
      <span className="block text-xs font-medium text-gray-500">Block Data (JSON)</span>
      <textarea
        className={`w-full rounded border px-2 py-1.5 font-mono text-xs focus:outline-none ${
          parseError ? 'border-red-400 bg-red-50' : 'focus:border-indigo-400'
        }`}
        rows={10}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
      />
      {parseError && <p className="text-xs text-red-500">{parseError}</p>}
    </div>
  );
}
