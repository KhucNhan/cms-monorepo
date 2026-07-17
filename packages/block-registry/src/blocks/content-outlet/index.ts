import { contentOutletSchema, type ContentOutletData } from './schema';
import type { BlockDefinition } from '../../types';

/**
 * content-outlet block definition — MARKER ONLY.
 *
 * This block type exists solely so `getBlockDefinition('content-outlet')`
 * does NOT throw "Unknown block type". It is never stored as a real Block
 * in page_versions — it only lives in template_placeholders to mark the
 * position of the free-form outlet zone.
 *
 * - No Editor component (getBlockEditor returns undefined → falls back to JsonFallbackEditor)
 * - No Renderer component (mergeTemplateWithPage expands it into the outlet blocks)
 * - Cannot be picked via BlockPickerModal (filtered out from getAllBlockDefinitions() in picker UI)
 */
export const contentOutletBlock: BlockDefinition<typeof contentOutletSchema> = {
  type: 'content-outlet',
  label: 'Content Outlet',
  icon: 'view_agenda',
  schema: contentOutletSchema,
  defaultData: {} satisfies ContentOutletData,
  // No Editor — intentional. Admin-web renders this as a special locked card.
  // No Renderer — intentional. apps/web never receives this block type in API response.
};

export { contentOutletSchema, type ContentOutletData };
