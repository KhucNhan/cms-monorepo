import { z } from 'zod';

/**
 * content-outlet schema — intentionally empty.
 * This block is a MARKER ONLY: it defines the position of the free-form
 * block zone inside a Template layout. It has no data of its own.
 * Never rendered directly; resolved by mergeTemplateWithPage() at API layer.
 */
export const contentOutletSchema = z.object({});

export type ContentOutletData = z.infer<typeof contentOutletSchema>;
