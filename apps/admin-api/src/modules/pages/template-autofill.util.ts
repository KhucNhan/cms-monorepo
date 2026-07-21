// apps/admin-api/src/modules/pages/template-autofill.util.ts
import { Page } from '@prisma/client';

/**
 * Resolves an autoFillMap entry like { "title": "page.title" } against a
 * freshly created Page row. Only a whitelisted set of "page.*" sources is
 * supported — unknown sources are ignored (not thrown), so a malformed
 * TemplatePlaceholder.autoFillMap never blocks page creation.
 */
const SUPPORTED_SOURCES: Record<string, (page: Page) => unknown> = {
  'page.title': (page) => page.title,
  'page.slug': (page) => page.slug,
};

export function resolveAutoFill(
  defaultData: Record<string, unknown>,
  autoFillMap: Record<string, string> | null | undefined,
  page: Page,
): Record<string, unknown> {
  if (!autoFillMap) return defaultData;

  const result = { ...defaultData };
  for (const [fieldPath, source] of Object.entries(autoFillMap)) {
    const resolver = SUPPORTED_SOURCES[source];
    if (!resolver) continue; // unknown source key -> skip, don't fail create()
    result[fieldPath] = resolver(page);
  }
  return result;
}