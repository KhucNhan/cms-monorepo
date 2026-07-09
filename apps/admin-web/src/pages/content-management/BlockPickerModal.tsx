import { useState } from 'react';
import { getAllBlockDefinitions } from '@cms/block-registry';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const previewDef = definitions.find((d) => d.type === previewType);

  const filteredDefinitions = definitions.filter((def) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      def.label.toLowerCase().includes(q) ||
      def.type.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open onOpenChange={() => {/* no-op: chỉ đóng qua nút X */}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
        className="bg-surface flex flex-col rounded-xl p-xl shadow-2xl border border-outline-variant w-full sm:max-w-5xl h-[760px]"
      >
        <div className="flex justify-between items-center mb-md border-b border-outline-variant h-fit pb-sm">
          <h3 className="text-h3 font-h3 text-on-surface">Select Block Type</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-body-md h-fit text-on-surface-variant mb-lg">
          Choose a block type to insert into your page. This will populate with its default settings.
        </p>

        <div className="relative mb-lg">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search block type…"
            autoFocus
            className="w-full pl-10 pr-3 py-sm rounded-lg border border-outline-variant bg-surface-container-low text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>

        <div className="flex gap-lg flex-1 min-h-0">
          <div className="grid grid-cols-2 max-w-[300px] gap-sm flex-1 overflow-y-auto content-start pr-1">
            {filteredDefinitions.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center gap-sm py-2xl text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px] opacity-50">search_off</span>
                <p className="text-body-md">No block type matches "{search}"</p>
              </div>
            ) : (
              filteredDefinitions.map((def) => {
                const materialIcon = ICON_MAP[def.icon] ?? ICON_MAP[def.type] ?? 'widgets';
                return (
                  <button
                    key={def.type}
                    onClick={() => onSelect(def.type)}
                    onMouseEnter={() => setPreviewType(def.type)}
                    onMouseLeave={() => setPreviewType((cur) => (cur === def.type ? null : cur))}
                    onFocus={() => setPreviewType(def.type)}
                    className="flex flex-col items-center gap-sm p-lg border border-outline-variant hover:border-primary hover:bg-primary/5 rounded-xl transition-all text-center group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                      {def.thumbnail ? (
                        <img
                          src={def.thumbnail}
                          alt={def.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[24px]">{materialIcon}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-label-md font-bold text-on-surface">{def.label}</p>
                      <p className="text-[10px] text-on-surface-variant mt-xs opacity-75 capitalize">
                        {def.type.replace('-', ' ')}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Preview panel: hiện thumbnail lớn của block đang hover/focus */}
          <div className="w-[640px] shrink-0 border border-outline-variant rounded-xl bg-surface-container-low flex items-center justify-center overflow-hidden">
            {previewDef?.thumbnail ? (
              <img
                src={previewDef.thumbnail}
                alt={previewDef.label}
                className="w-full h-full object-contain"
              />
            ) : (
              <p className="text-[10px] text-on-surface-variant text-center px-sm opacity-60">
                Hover a block to preview
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}