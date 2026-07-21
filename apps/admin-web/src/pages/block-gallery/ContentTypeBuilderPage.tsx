import { useState, useMemo } from 'react';
import { useAppLayoutHeader } from '@/context/AppLayoutContext';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { cn } from '@/config/cn';
import { getAllBlockDefinitions } from '@cms/block-registry';
import type { ContentField, ContentType, FieldType } from '@/types';

// ─── Field type inference từ defaultData value ────────────────────────────────

function inferFieldType(value: unknown): FieldType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number')  return 'number';
  if (Array.isArray(value))       return 'relation';
  if (typeof value === 'string') {
    // Heuristic: string dài hoặc có HTML → richtext
    if (value.length > 80 || value.includes('<')) return 'richtext';
    return 'text';
  }
  return 'text';
}

function toDisplayName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Map block registry → ContentType[] ──────────────────────────────────────

function buildTypesFromRegistry(): ContentType[] {
  return getAllBlockDefinitions().map((def) => ({
    id:    def.type,
    name:  def.label,
    apiId: def.type,
    icon:  def.icon,
    fields: Object.entries(def.defaultData).map(([key, value]) => ({
      id:          `${def.type}-${key}`,
      displayName: toDisplayName(key),
      apiId:       key,
      type:        inferFieldType(value),
      required:    false,
      private:     false,
    })),
  }));
}

// ─── Field type meta (icon + color cho UI) ────────────────────────────────────

const FIELD_TYPE_META: Record<FieldType, { icon: string; label: string; color: string; bg: string }> = {
  text:     { icon: 'title',          label: 'Text',      color: 'text-primary',                bg: 'bg-primary-container/10' },
  number:   { icon: 'payments',       label: 'Number',    color: 'text-tertiary',               bg: 'bg-tertiary-container/10' },
  richtext: { icon: 'notes',          label: 'Rich Text', color: 'text-secondary',              bg: 'bg-secondary-container/30' },
  media:    { icon: 'image',          label: 'Media',     color: 'text-primary',                bg: 'bg-on-primary-container/10' },
  boolean:  { icon: 'toggle_on',      label: 'Boolean',   color: 'text-on-secondary-container', bg: 'bg-secondary-container/30' },
  date:     { icon: 'calendar_today', label: 'Date',      color: 'text-tertiary',               bg: 'bg-tertiary-container/10' },
  email:    { icon: 'email',          label: 'Email',     color: 'text-secondary',              bg: 'bg-secondary-container/20' },
  relation: { icon: 'link',           label: 'Relation',  color: 'text-on-surface-variant',     bg: 'bg-outline-variant/20' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentTypeBuilderPage() {
  const registryTypes = useMemo(() => buildTypesFromRegistry(), []);
  const [types, setTypes] = useState<ContentType[]>(registryTypes);
  const [activeTypeId, setActiveTypeId] = useState<string>(registryTypes[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [selectedField, setSelectedField] = useState<ContentField | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const activeType = types.find((t) => t.id === activeTypeId);
  const filteredTypes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return types;
    return types.filter((type) =>
      type.name.toLowerCase().includes(term) ||
      type.apiId?.toLowerCase().includes(term),
    );
  }, [search, types]);

  useAppLayoutHeader({
    title: 'Block Gallery',
    actions: (
      <SearchInput placeholder="Search blocks..." value={search} onChange={setSearch} />
    ),
  });

  if (!activeType) {
    return (
        <div className="flex items-center justify-center h-full text-on-surface-variant">
          No block types registered.
        </div>
    );
  }

  // const handleSave = () => addToast(`Saved "${activeType.name}" content type.`, 'success');

  const handleDeleteField = (fieldId: string) => {
    setTypes((prev) =>
      prev.map((t) =>
        t.id === activeTypeId
          ? { ...t, fields: t.fields.filter((f) => f.id !== fieldId) }
          : t,
      ),
    );
    if (selectedField?.id === fieldId) setSelectedField(null);
    addToast('Field removed.', 'info');
  };

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* ── Left panel: Block Types list ── */}
        <nav className="w-64 border-r border-outline-variant bg-surface-container-lowest flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <span className="text-label-md font-label-md text-secondary uppercase tracking-wider">
              Block Types
            </span>
          </div>

          <ul className="flex flex-col flex-1">
            {filteredTypes.map((type) => (
              <li key={type.id}>
                <button
                  onClick={() => { setActiveTypeId(type.id); setSelectedField(null); }}
                  className={cn(
                    'w-full flex items-center gap-sm px-md py-sm text-left transition-colors border-l-2',
                    type.id === activeTypeId
                      ? 'bg-primary/5 text-primary font-bold border-primary'
                      : 'text-on-surface hover:bg-surface-container border-transparent',
                  )}
                >
                  <span className={cn('material-symbols-outlined text-[18px]', type.id === activeTypeId ? 'text-primary' : 'text-outline')}>
                    widgets
                  </span>
                  <span className="text-body-md">{type.name}</span>
                  <span className="ml-auto text-label-sm text-on-surface-variant opacity-60">
                    {type.fields.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Center: Field list ── */}
        <div className="flex-1 bg-background overflow-y-auto custom-scrollbar p-xl">
          <div className="max-w-[800px] mx-auto">
            <div className="mb-xl">
              <div className="flex items-center gap-sm mb-xs">
                <span className="text-h1 font-h1 text-on-surface">{activeType.name}</span>
                <span className="px-sm py-xs rounded-full bg-primary/10 text-primary text-label-sm font-bold">
                  {activeType.fields.length} fields
                </span>
              </div>
              <p className="text-on-surface-variant text-body-md">
                Block type: <code className="font-mono bg-surface-container px-xs rounded">{activeType.apiId}</code>
                {' '}— configure fields and attributes.
              </p>
            </div>

            <div className="space-y-md">
              {(activeType.fields as ContentField[]).map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  isSelected={selectedField?.id === field.id}
                  isDragging={dragId === field.id}
                  onSelect={() => setSelectedField(field)}
                  onDelete={() => handleDeleteField(field.id)}
                  onDragStart={() => setDragId(field.id)}
                  onDragEnd={() => setDragId(null)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: ContentField;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function FieldRow({ field, isSelected, isDragging, onSelect, onDragStart, onDragEnd }: FieldRowProps) {
  const meta = FIELD_TYPE_META[field.type] ?? FIELD_TYPE_META['text'];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        'group bg-white border rounded-lg p-md flex items-center gap-md hover:shadow-md transition-all cursor-pointer',
        isSelected
          ? 'border-primary/30 bg-primary/5 ring-2 ring-primary/20'
          : 'border-outline-variant',
        isDragging && 'scale-[1.01] ring-2 ring-primary/20 z-10',
      )}
    >

      {/* Icon */}
      <div className={cn('w-10 h-10 rounded flex items-center justify-center', meta.bg)}>
        <span className={cn('material-symbols-outlined', meta.color)}>{meta.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={cn('font-bold truncate', isSelected ? 'text-primary' : 'text-on-surface')}>
          {field.displayName}
        </div>
        <div className="text-label-md text-on-surface-variant">
          <code className="font-mono text-[11px] text-outline">{field.apiId}</code>
          {' · '}{meta.label}
          {field.required && ' · Required'}
          {field.private && ' · Private'}
        </div>
      </div>
    </div>
  );
}
