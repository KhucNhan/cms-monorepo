import { useState, useEffect } from 'react';

interface JsonBlockEditorProps {
  data: any;
  onChange: (newData: any) => void;
}

export function JsonBlockEditor({ data, onChange }: JsonBlockEditorProps) {
  const [jsonString, setJsonString] = useState(JSON.stringify(data, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJsonString(JSON.stringify(data, null, 2));
    setJsonError(null);
  }, [data]);

  const handleJsonChange = (val: string) => {
    setJsonString(val);
    try {
      const parsed = JSON.parse(val);
      setJsonError(null);
      onChange(parsed);
    } catch (e: any) {
      setJsonError(e.message ?? 'Invalid JSON syntax');
    }
  };

  return (
    <div className="flex flex-col gap-xs">
      <label className="text-label-md font-bold text-on-surface">Block Raw Data (JSON)</label>
      <textarea
        rows={8}
        value={jsonString}
        onChange={(e) => handleJsonChange(e.target.value)}
        className={`bg-surface border rounded-lg px-sm py-2 text-body-md font-mono outline-none w-full ${
          jsonError ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary'
        }`}
      />
      {jsonError && (
        <span className="text-[11px] font-bold text-error flex items-center gap-xs">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {jsonError}
        </span>
      )}
    </div>
  );
}
