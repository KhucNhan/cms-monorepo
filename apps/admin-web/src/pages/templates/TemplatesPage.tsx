import { useEffect, useState, useMemo } from 'react';
import { useAppLayoutHeader } from '@/context/AppLayoutContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { usePermissions } from '@/hooks/usePermissions';
import { templatesApi, PreviewDeleteResponse } from '@/api/templates.api';
import { ApiClientError } from '@/api/client';
import type { Template, TemplatePlaceholder } from '@/types';
import { getAllBlockDefinitions } from '@cms/block-registry';

// Material Icons map
const ICON_MAP: Record<string, string> = {
  hero: 'view_day',
  'rich-text': 'notes',
  faq: 'help',
  'content-outlet': 'vertical_align_center',
  // Phase D marker — "next project" link, resolved at read-time by
  // PublicPagesController, never stored with real data of its own.
  'next-project': 'arrow_forward',
};

export function TemplatesPage() {
  const { can } = usePermissions();
  const { toasts, addToast, removeToast } = useToast();

  const canManage = can('template:update');
  const canDelete = can('template:delete');
  const canCreate = can('template:create');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Creation State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Deletion state
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Placeholder Deletion State (UX warn)
  const [pendingDeletePlaceholder, setPendingDeletePlaceholder] = useState<string | null>(null);
  const [affectedPagesInfo, setAffectedPagesInfo] = useState<PreviewDeleteResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Drag & Drop index
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templatesApi.list();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplateId) {
        selectTemplate(data[0]);
      }
    } catch (err) {
      setError('Failed to fetch templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTemplate = async (template: Template) => {
    setSelectedTemplateId(template.id);
    setIsDirty(false);
    try {
      const detail = await templatesApi.getOne(template.id);
      const items = detail.placeholders ?? [];
      setPlaceholders(items);
    } catch (err) {
      addToast('Failed to load template details', 'error');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    setIsCreating(true);
    try {
      // contentType removed — Template no longer maps 1:1 to a fixed content
      // type. slugPrefix is generated server-side from `name`
      // (TemplatesService.buildSlugPrefix), never sent by the client.
      const created = await templatesApi.create({
        name: newTemplateName.trim(),
      });
      addToast('Template created successfully', 'success');
      setTemplates((prev) => [...prev, created]);
      selectTemplate(created);
      setNewTemplateName('');
    } catch (err) {
      addToast(err instanceof ApiClientError ? err.message : 'Failed to create template', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    setIsDeleting(true);
    try {
      await templatesApi.remove(deleteTemplateId);
      addToast('Template deleted successfully', 'info');
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTemplateId));
      if (selectedTemplateId === deleteTemplateId) {
        setSelectedTemplateId(null);
        setPlaceholders([]);
      }
    } catch (err) {
      addToast(err instanceof ApiClientError ? err.message : 'Failed to delete template', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTemplateId(null);
    }
  };

  const handleAddPlaceholder = (type: string) => {
    if (placeholders.some((p) => p.type === type && type !== 'content-outlet')) {
      addToast('Duplicate placeholder types are not allowed.', 'error');
      return;
    }
    const newPlaceholder: TemplatePlaceholder = {
      id: `temp-${Date.now()}`,
      templateId: selectedTemplateId!,
      type,
      orderIndex: placeholders.length,
      autoFillMap: null,
      updatedAt: new Date().toISOString(),
    };
    const updated = [...placeholders, newPlaceholder];
    setPlaceholders(updated);
    setIsDirty(true);
  };

  const handleRemovePlaceholderClick = async (placeholderType: string) => {
    if (placeholderType === 'content-outlet') return;

    // Check affected pages
    setLoadingPreview(true);
    try {
      const preview = await templatesApi.previewDelete(selectedTemplateId!, placeholderType);
      if (preview.affectedPageCount > 0) {
        setAffectedPagesInfo(preview);
        setPendingDeletePlaceholder(placeholderType);
      } else {
        // Safe to remove immediately
        removePlaceholder(placeholderType);
      }
    } catch (err) {
      addToast('Failed to check usage preview.', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const removePlaceholder = (type: string) => {
    const updated = placeholders
      .filter((p) => p.type !== type)
      .map((p, idx) => ({ ...p, orderIndex: idx }));
    setPlaceholders(updated);
    setIsDirty(true);
    setPendingDeletePlaceholder(null);
    setAffectedPagesInfo(null);
  };

  const handleSavePlaceholders = async () => {
    if (!selectedTemplateId) return;
    try {
      const payload = placeholders.map((p, idx) => ({
        type: p.type,
        orderIndex: idx,
      }));
      const updated = await templatesApi.setPlaceholders(selectedTemplateId, payload);
      setPlaceholders(updated.placeholders ?? []);
      setIsDirty(false);
      addToast('Template placeholders saved successfully', 'success');
    } catch (err) {
      addToast(err instanceof ApiClientError ? err.message : 'Failed to save layout', 'error');
    }
  };

  // Drag & drop logic
  const handleDragStart = (idx: number) => {
    if (!canManage) return;
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null) return;
    const list = [...placeholders];
    const [moved] = list.splice(draggedIdx, 1);
    list.splice(idx, 0, moved);
    const updated = list.map((p, i) => ({ ...p, orderIndex: i }));
    setPlaceholders(updated);
    setIsDirty(true);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Filter available block definitions (exclude content-outlet, no duplicate placeholders)
  const availableBlocks = useMemo(() => {
    const registryBlocks = getAllBlockDefinitions();
    return registryBlocks.filter(
      (def) =>
        def.type !== 'content-outlet' &&
        !placeholders.some((p) => p.type === def.type),
    );
  }, [placeholders]);

  useAppLayoutHeader({ title: 'Templates' });

  return (
    <>
      <div className="p-xl grid grid-cols-[320px_1fr] gap-xl max-w-7xl mx-auto">

        {/* Left Side: Templates List + Creation Form */}
        <div className="flex flex-col gap-lg bg-surface-container-lowest rounded-xl border border-outline-variant p-lg h-fit shadow-sm">
          <h3 className="text-h3 font-h3 text-on-surface">Layout Templates</h3>

          {loading && <p className="text-body-md text-on-surface-variant">Loading templates...</p>}
          {error && <p className="text-body-md text-error">{error}</p>}

          <div className="flex flex-col gap-xs">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-md py-sm rounded-lg cursor-pointer transition-all ${
                  selectedTemplateId === t.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'hover:bg-surface-container-low text-on-surface'
                }`}
                onClick={() => selectTemplate(t)}
              >
                <div className="flex flex-col">
                  <span>{t.name}</span>
                  {/* slugPrefix is server-generated & immutable — replaces the
                      old contentType badge. It's the exact path segment used
                      in the public route (/{slugPrefix}/{slug}) and in the
                      Sidebar's dynamic nav item for this template. */}
                  <span className="text-[11px] text-on-surface-variant uppercase font-medium">
                    /{t.slugPrefix}
                  </span>
                </div>
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTemplateId(t.id);
                    }}
                    className="p-1 hover:text-error rounded transition-colors text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {canCreate && (
            <form onSubmit={handleCreateTemplate} className="border-t border-outline-variant pt-lg flex flex-col gap-md">
              <h4 className="text-label-md font-bold text-on-surface uppercase">Create Template</h4>
              <Input
                label="Template Name"
                placeholder="Blog Post Layout"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              {/* Content Type selector removed — Template no longer maps 1:1
                  to a fixed content type. slugPrefix is auto-derived from the
                  name above (e.g. "Project" -> "projects"). */}
              <Button type="submit" variant="primary" loading={isCreating} disabled={!newTemplateName.trim()}>
                Create Template
              </Button>
            </form>
          )}
        </div>

        {/* Right Side: Layout Builder / Placeholders */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl shadow-sm">
          {selectedTemplate ? (
            <div className="flex flex-col gap-lg">
              <div className="flex justify-between items-center border-b border-outline-variant pb-md">
                <div>
                  <h2 className="text-h2 font-h2 text-on-surface">{selectedTemplate.name} Layout</h2>
                  <p className="text-body-sm text-on-surface-variant uppercase font-bold mt-xs">
                    Public route: /{selectedTemplate.slugPrefix}/{'{slug}'}
                  </p>
                </div>
                {canManage && (
                  <Button variant="primary" disabled={!isDirty} onClick={handleSavePlaceholders}>
                    Save Layout
                  </Button>
                )}
              </div>

              <p className="text-body-md text-on-surface-variant">
                Define the placeholders and their rendering order. Drag the handles to reorder.
                Pages using this template will implement each placeholder below, while free-form content goes into the <strong>Content Outlet</strong>.
              </p>

              {/* Placeholder Editor list */}
              <div className="flex flex-col gap-sm">
                {placeholders.map((p, idx) => {
                  const isOutlet = p.type === 'content-outlet';
                  const isOver = dragOverIdx === idx;
                  const iconName = ICON_MAP[p.type] ?? 'widgets';

                  return (
                    <div
                      key={p.id}
                      draggable={canManage}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => {
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      className={`flex items-center flex-wrap gap-md p-md border rounded-xl transition-all ${
                        isOutlet
                          ? 'bg-secondary/5 border-secondary/30'
                          : 'bg-surface border-outline-variant'
                      } ${isOver ? 'border-primary border-2 translate-y-1' : ''}`}
                    >
                      {canManage && (
                        <span className="material-symbols-outlined text-on-surface-variant cursor-grab active:cursor-grabbing select-none">
                          drag_indicator
                        </span>
                      )}

                      <div className={`p-sm rounded-lg ${isOutlet ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                        <span className="material-symbols-outlined text-[20px]">{iconName}</span>
                      </div>

                      <div className="flex-1">
                        <p className={`text-body-md font-bold ${isOutlet ? 'text-secondary' : 'text-on-surface'}`}>
                          {isOutlet
                            ? 'Content Outlet (Slot for free-form blocks)'
                            : p.type === 'next-project'
                              ? 'Next Project (link to next published sibling page)'
                              : p.type.toUpperCase() + ' Placeholder'}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {isOutlet
                            ? 'Page contents will insert here in this position.'
                            : p.type === 'next-project'
                              ? 'Marker only — resolved automatically at read-time, no data to configure.'
                              : p.type === 'hero'
                                ? `Static placeholder. 'title' is auto-filled from the page's title.`
                                : `Static placeholder. Page must supply '${p.type}' block.`}
                        </p>
                      </div>

                      {!isOutlet && canManage && (
                        <button
                          onClick={() => handleRemovePlaceholderClick(p.type)}
                          className="p-1.5 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-error transition-all"
                          title="Remove placeholder"
                          disabled={loadingPreview}
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Placeholder controls */}
              {canManage && (availableBlocks.length > 0 || !placeholders.some((p) => p.type === 'next-project')) && (
                <div className="border-t border-outline-variant pt-lg mt-md">
                  <h4 className="text-label-md font-bold text-on-surface uppercase mb-md">Add Layout Placeholder</h4>
                  <div className="flex flex-wrap gap-sm">
                    {availableBlocks.map((def) => {
                      const iconName = ICON_MAP[def.type] ?? 'widgets';
                      return (
                        <button
                          key={def.type}
                          onClick={() => handleAddPlaceholder(def.type)}
                          className="flex items-center gap-sm px-md py-sm border border-outline-variant rounded-lg hover:bg-primary/5 transition-colors text-body-md text-on-surface font-medium"
                        >
                          <span className="material-symbols-outlined text-primary text-[18px]">{iconName}</span>
                          Add {def.label}
                        </button>
                      );
                    })}

                    {/* next-project is a marker (not in block-registry's
                        assignable list the same way content-outlet is
                        excluded from availableBlocks), added via its own
                        dedicated button — optional per template, unlike
                        content-outlet which is mandatory. */}
                    {!placeholders.some((p) => p.type === 'next-project') && (
                      <button
                        onClick={() => handleAddPlaceholder('next-project')}
                        className="flex items-center gap-sm px-md py-sm border border-dashed border-outline-variant rounded-lg hover:bg-primary/5 transition-colors text-body-md text-on-surface-variant font-medium"
                      >
                        <span className="material-symbols-outlined text-primary text-[18px]">arrow_forward</span>
                        Add Next Project Link
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2xl text-on-surface-variant opacity-75">
              <span className="material-symbols-outlined text-[48px] mb-sm">view_carousel</span>
              <p className="text-body-md font-medium">Select or create a layout template to begin editing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Template Confirmation Modal */}
      {deleteTemplateId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-xl z-50 animate-fade-in">
          <div className="bg-surface rounded-xl p-xl max-w-md w-full border border-outline-variant shadow-2xl">
            <h3 className="text-h3 font-h3 text-on-surface mb-md">Delete Template</h3>
            <p className="text-body-md text-on-surface-variant mb-lg">
              Are you sure you want to delete this template? This action is permanent. It will fail if any page is still using it.
            </p>
            <div className="flex gap-md justify-end">
              <Button variant="ghost" onClick={() => setDeleteTemplateId(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteTemplate} loading={isDeleting}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Placeholder Affected Pages Warning Modal */}
      {pendingDeletePlaceholder && affectedPagesInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-xl z-50 animate-fade-in">
          <div className="bg-surface rounded-xl p-xl max-w-lg w-full border border-outline-variant shadow-2xl">
            <div className="flex items-center gap-sm text-warning mb-md">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-h3 font-h3 text-on-surface">Data Visibility Warning</h3>
            </div>
            <p className="text-body-md text-on-surface-variant mb-md">
              Removing the <strong>{pendingDeletePlaceholder}</strong> placeholder will hide this content from
              <strong> {affectedPagesInfo.affectedPageCount} page(s)</strong> currently using this layout.
            </p>
            <p className="text-body-sm text-on-surface-variant mb-lg">
              The content will not be deleted from the database. If you re-add this placeholder to the layout later,
              the content will automatically reappear.
            </p>

            <div className="max-h-40 overflow-y-auto border border-outline-variant rounded-lg p-sm mb-lg bg-surface-container-low">
              <p className="text-label-sm font-bold text-on-surface-variant mb-xs">Affected Pages:</p>
              <ul className="list-disc pl-md text-body-sm text-on-surface flex flex-col gap-1">
                {affectedPagesInfo.affectedPages.map((p) => (
                  <li key={p.id}>{p.title}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-md justify-end">
              <Button variant="ghost" onClick={() => { setPendingDeletePlaceholder(null); setAffectedPagesInfo(null); }}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => removePlaceholder(pendingDeletePlaceholder)}>
                Confirm & Hide Content
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}