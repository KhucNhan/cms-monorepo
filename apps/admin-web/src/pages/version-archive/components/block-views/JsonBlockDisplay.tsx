interface JsonBlockDisplayProps {
  data: unknown;
}

export function JsonBlockDisplay({ data }: JsonBlockDisplayProps) {
  return (
    <div className="flex flex-col gap-xs">
      <span className="text-label-sm text-on-surface-variant">Block Raw Data (JSON)</span>
      <pre className="text-label-sm text-on-surface font-mono whitespace-pre-wrap break-all leading-relaxed border border-outline-variant rounded-lg px-md py-sm bg-surface-container-lowest overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}