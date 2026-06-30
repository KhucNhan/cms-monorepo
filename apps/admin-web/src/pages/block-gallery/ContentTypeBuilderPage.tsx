import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
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

  const [types, setTypes]               = useState<ContentType[]>(registryTypes);
  const [activeTypeId, setActiveTypeId] = useState<string>(registryTypes[0]?.id ?? '');
  const [selectedField, setSelectedField] = useState<ContentField | null>(null);
  const [dragId, setDragId]             = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const activeType = types.find((t) => t.id === activeTypeId);

  if (!activeType) {
    return (
      <AppLayout title="Block Gallery" >
        <div className="flex items-center justify-center h-full text-on-surface-variant">
          No block types registered.
        </div>
      </AppLayout>
    );
  }

  const handleSave = () => addToast(`Saved "${activeType.name}" content type.`, 'success');

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

  const handleFieldChange = (key: keyof ContentField, value: unknown) => {
    if (!selectedField) return;
    const updated = { ...selectedField, [key]: value };
    setSelectedField(updated);
    setTypes((prev) =>
      prev.map((t) =>
        t.id === activeTypeId
          ? { ...t, fields: t.fields.map((f) => (f.id === selectedField.id ? updated : f)) }
          : t,
      ),
    );
  };

  return (
    <AppLayout
      title="Block Gallery"
      // breadcrumb={{ label: 'Content-Type Builder', highlight: activeType.name }}
      // actions={
      //   <>
      //     <Button variant="secondary" size="md">Cancel</Button>
      //     <Button variant="primary"   size="md" onClick={handleSave}>Save Changes</Button>
      //   </>
      // }
    >
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* ── Left panel: Block Types list ── */}
        <nav className="w-64 border-r border-outline-variant bg-surface-container-lowest flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <span className="text-label-md font-label-md text-secondary uppercase tracking-wider">
              Block Types
            </span>
            {/* <button
              className="text-primary hover:text-on-primary-fixed-variant transition-colors"
              title="Add new type"
              onClick={() => addToast('Block type creation coming soon.', 'info')}
            >
              <span className="material-symbols-outlined">add_box</span>
            </button> */}
          </div>

          <ul className="flex flex-col flex-1">
            {types.map((type) => (
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

              {/* Add field button */}
              {/* <button
                onClick={() => addToast('Field palette coming soon.', 'info')}
                className="w-full py-xl border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full border border-outline-variant group-hover:border-primary flex items-center justify-center mb-sm transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <span className="font-bold">Add another field</span>
                <span className="text-label-md opacity-60">Text, Number, Date, Media, and more</span>
              </button> */}
            </div>
          </div>
        </div>

        {/* ── Right panel: Field Settings ── */}
        {/* <aside className="w-80 border-l border-outline-variant bg-surface-container-low flex-shrink-0 flex flex-col overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container flex items-center gap-sm flex-shrink-0">
            <span className="material-symbols-outlined text-primary">settings_applications</span>
            <span className="font-bold text-on-surface">Field Settings</span>
          </div>

          {selectedField ? (
            <FieldSettingsPanel
              field={selectedField}
              onChange={handleFieldChange}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-xl text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">
                touch_app
              </span>
              <p className="text-body-md">Select a field to edit its settings</p>
            </div>
          )}
        </aside> */}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
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

function FieldRow({ field, isSelected, isDragging, onSelect, onDelete, onDragStart, onDragEnd }: FieldRowProps) {
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
      {/* Drag handle */}
      {/* <div
        className={cn(
          'text-outline-variant group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing',
          isSelected && 'text-primary',
        )}
      >
        <span className="material-symbols-outlined">drag_indicator</span>
      </div> */}

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

      {/* Actions */}
      {/* <div
        className={cn(
          'flex items-center gap-sm transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onSelect}
          className="p-xs hover:bg-surface-container rounded text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </button>
        <button
          onClick={onDelete}
          className="p-xs hover:bg-error-container/20 rounded text-error transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div> */}
    </div>
  );
}

// ─── FieldSettingsPanel ───────────────────────────────────────────────────────

// interface FieldSettingsPanelProps {
//   field: ContentField;
//   onChange: (key: keyof ContentField, value: unknown) => void;
// }

// function FieldSettingsPanel({ field, onChange }: FieldSettingsPanelProps) {
//   const meta = FIELD_TYPE_META[field.type] ?? FIELD_TYPE_META['text'];

//   return (
//     <div className="flex-1 flex flex-col overflow-hidden">
//       <div className="flex-1 overflow-y-auto custom-scrollbar p-md space-y-xl">
//         {/* Basic Info */}
//         <div className="space-y-md">
//           <label className="block">
//             <span className="text-label-md font-label-md text-secondary uppercase tracking-wider mb-xs block">
//               Display Name
//             </span>
//             <input
//               type="text"
//               value={field.displayName}
//               onChange={(e) => onChange('displayName', e.target.value)}
//               className="w-full bg-white border border-outline rounded p-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
//             />
//           </label>

//           <label className="block">
//             <span className="text-label-md font-label-md text-secondary uppercase tracking-wider mb-xs block">
//               API ID
//             </span>
//             <input
//               type="text"
//               value={field.apiId}
//               readOnly
//               className="w-full bg-surface-variant/50 border border-outline-variant rounded p-sm font-code text-code text-on-surface-variant cursor-not-allowed"
//             />
//             <p className="text-[10px] text-on-surface-variant mt-xs">Auto-generated from display name.</p>
//           </label>
//         </div>

//         {/* Type selector */}
//         <div>
//           <span className="text-label-md font-label-md text-secondary uppercase tracking-wider mb-md block">
//             Data Type
//           </span>
//           <div className="grid grid-cols-2 gap-sm">
//             {(Object.keys(FIELD_TYPE_META) as FieldType[]).slice(0, 4).map((type) => {
//               const m = FIELD_TYPE_META[type];
//               return (
//                 <button
//                   key={type}
//                   onClick={() => onChange('type', type)}
//                   className={cn(
//                     'p-sm rounded border flex items-center gap-sm cursor-pointer transition-all',
//                     field.type === type
//                       ? 'border-primary bg-primary/5 text-primary'
//                       : 'border-outline-variant bg-white hover:border-primary/50 text-on-surface-variant',
//                   )}
//                 >
//                   <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
//                   <span className="text-xs font-semibold">{m.label}</span>
//                 </button>
//               );
//             })}
//           </div>
//           <div className="mt-sm">
//             <span className="text-[10px] text-on-surface-variant">
//               Current:{' '}
//               <span className={cn('font-bold', meta.color)}>{meta.label}</span>
//             </span>
//           </div>
//         </div>

//         <hr className="border-outline-variant" />

//         {/* Validations */}
//         <div>
//           <span className="text-label-md font-label-md text-secondary uppercase tracking-wider mb-md block">
//             Validations
//           </span>
//           <div className="space-y-sm">
//             <ToggleRow
//               label="Required field"
//               checked={field.required}
//               onChange={(v) => onChange('required', v)}
//             />
//             <ToggleRow
//               label="Private field"
//               checked={field.private}
//               onChange={(v) => onChange('private', v)}
//             />
//           </div>
//         </div>

//         {/* Advanced */}
//         <details className="group">
//           <summary className="text-label-md font-label-md text-secondary uppercase tracking-wider flex items-center justify-between cursor-pointer list-none">
//             <span>Advanced Settings</span>
//             <span className="material-symbols-outlined transition-transform group-open:rotate-180">
//               expand_more
//             </span>
//           </summary>
//           <div className="pt-sm space-y-md">
//             <label className="block">
//               <span className="text-xs text-on-surface-variant block mb-xs">Default Value</span>
//               <input
//                 type="text"
//                 placeholder="Enter default value..."
//                 className="w-full bg-white border border-outline-variant rounded p-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
//               />
//             </label>
//             <label className="block">
//               <span className="text-xs text-on-surface-variant block mb-xs">Placeholder Text</span>
//               <input
//                 type="text"
//                 placeholder="Describe the field..."
//                 className="w-full bg-white border border-outline-variant rounded p-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
//               />
//             </label>
//           </div>
//         </details>
//       </div>

//       {/* Footer */}
//       <div className="p-md border-t border-outline-variant flex-shrink-0">
//         <button className="w-full bg-surface-container-highest text-secondary border border-outline-variant py-sm rounded font-bold hover:bg-outline-variant/20 transition-all">
//           Reset to Default
//         </button>
//       </div>
//     </div>
//   );
// }

// ─── ToggleRow ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group select-none">
      <span className="text-body-md text-on-surface group-hover:text-primary transition-colors">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20',
          checked ? 'bg-primary' : 'bg-outline-variant',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  );
}