import { z } from 'zod';

/**
 * next-project schema — intentionally empty.
 * This block is a MARKER ONLY, like content-outlet: it defines the position
 * of the "next project" link inside a Template layout. It has no data of
 * its own in template_placeholders — the actual { nextPage } payload is
 * computed and injected at read-time by PublicPagesController.getBySlug(),
 * never stored in any Block row.
 */
export const nextProjectSchema = z.object({});

export type NextProjectData = z.infer<typeof nextProjectSchema>;