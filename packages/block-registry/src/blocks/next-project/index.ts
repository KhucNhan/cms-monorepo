import { nextProjectSchema, type NextProjectData } from './schema';
import type { BlockDefinition } from '../../types';

/**
 * next-project block definition — MARKER ONLY.
 *
 * Placed as a TemplatePlaceholder to mark where a "go to next project" link
 * should render. Its actual data ({ nextPage: { slug, title } }) is NEVER
 * stored in a Block row — it is computed fresh on every public request by
 * `PublicPagesController.getBySlug()` (Phase D resolver), the same way
 * `content-outlet` is expanded by `mergeTemplateWithPage()` rather than
 * carrying real data of its own.
 *
 * - No Editor component (falls back to JsonFallbackEditor in admin-web,
 *   though in practice this placeholder is not user-editable content).
 * - Renderer (apps/web) receives the enriched `{ nextPage }` data and
 *   renders the link — it does NOT need to know this block has no
 *   persisted data of its own.
 */
export const nextProjectBlock: BlockDefinition<typeof nextProjectSchema> = {
  type: 'next-project',
  label: 'Next Project',
  icon: 'arrow_forward',
  schema: nextProjectSchema,
  defaultData: {} satisfies NextProjectData,
  // No Editor — intentional, same rationale as content-outlet.
};

export { nextProjectSchema, type NextProjectData };