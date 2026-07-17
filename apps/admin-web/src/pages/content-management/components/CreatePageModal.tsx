import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { pagesApi } from '@/api/pages.api';
import { templatesApi } from '@/api/templates.api';
import { ApiClientError } from '@/api/client';
import type { Page, Template } from '@/types';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validateSlug(slug: string): string | undefined {
  if (!slug) return 'Slug is required';
  if (slug.length > 200) return 'Slug must be at most 200 characters';
  if (!SLUG_REGEX.test(slug)) return 'Use lowercase letters, numbers, and hyphens only';
  return undefined;
}

interface CreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (page: Page) => void;
}

export function CreatePageModal({ isOpen, onClose, onCreated }: CreatePageModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugError, setSlugError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setSlug('');
      setSlugTouched(false);
      setSlugError(undefined);
      setSubmitting(false);
      setSelectedTemplateId('');
    } else {
      // Fetch templates
      templatesApi.list()
        .then((data) => setTemplates(data))
        .catch((err) => console.error('Failed to load templates:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(titleToSlug(title));
    }
  }, [title, slugTouched]);

  useEffect(() => {
    if (slugError && slugError !== 'Slug đã tồn tại') {
      setSlugError(validateSlug(slug));
    }
  }, [slug, slugError]);

  const formatError = validateSlug(slug);
  const canSubmit = !formatError && !submitting;

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(value);
    setSlugError(validateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateSlug(slug);
    if (error) {
      setSlugError(error);
      return;
    }

    setSubmitting(true);
    setSlugError(undefined);

    try {
      const page = await pagesApi.create({
        title: title.trim() || undefined,
        slug,
        templateId: selectedTemplateId || undefined,
      });
      onCreated(page);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 409) {
        setSlugError('Slug đã tồn tại');
      } else {
        setSlugError(err instanceof ApiClientError ? err.message : 'Failed to create page');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {/* no-op: chỉ đóng qua nút X hoặc Cancel */}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
        className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-lg">
          <h3 className="text-h3 font-h3 text-on-surface">Create New Page</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="About Us"
            autoFocus
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            onBlur={() => setSlugError(validateSlug(slug))}
            placeholder="about-us"
            error={slugError}
            helperText={!slugError ? 'URL path: /about-us' : undefined}
          />

          <div className="flex flex-col gap-xs">
            <label className="text-label-sm font-medium text-on-surface-variant">Page Template (Optional)</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-md py-sm rounded-lg border border-outline-variant bg-surface text-body-md text-on-surface focus:outline-none"
            >
              <option value="">No Template (Free-form layout)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.contentType})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-md justify-end pt-sm">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
