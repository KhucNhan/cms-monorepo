import { getAllBlockDefinitions } from '@cms/block-registry';

interface BlockPickerModalProps {
  onSelect: (type: string) => void;
  onCancel: () => void;
}

// Map Lucide/registry icon names to Material Symbols icons
const ICON_MAP: Record<string, string> = {
  view_day: 'view_day',
  HelpCircle: 'help',
  icon: 'widgets',
  'rich-text': 'notes',
  hero: 'view_day',
};

export function BlockPickerModal({ onSelect, onCancel }: BlockPickerModalProps) {
  const definitions = getAllBlockDefinitions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-md mx-md">
        <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-sm">
          <h3 className="text-h3 font-h3 text-on-surface">Select Block Type</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <p className="text-body-md text-on-surface-variant mb-lg">
          Choose a block type to insert into your page. This will populate with its default settings.
        </p>

        <div className="grid grid-cols-2 gap-sm">
          {definitions.map((def) => {
            const materialIcon = ICON_MAP[def.icon] ?? ICON_MAP[def.type] ?? 'widgets';
            return (
              <button
                key={def.type}
                onClick={() => onSelect(def.type)}
                className="flex flex-col items-center gap-sm p-lg border border-outline-variant hover:border-primary hover:bg-primary/5 rounded-xl transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-[24px]">{materialIcon}</span>
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface">{def.label}</p>
                  <p className="text-[10px] text-on-surface-variant mt-xs opacity-75 capitalize">
                    {def.type.replace('-', ' ')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
