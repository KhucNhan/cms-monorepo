import { z } from 'zod';

export const heroSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or less'),

  subtitle: z
    .string()
    .max(240, 'Subtitle must be 240 characters or less')
    .optional(),

  image: z.object({
    mediaId: z.string(),
    alt: z.string().max(255),
  }),

  buttonText: z
    .string()
    .max(40, 'Button text must be 40 characters or less')
    .optional(),

  buttonHref: z
    .string()
    .max(500, 'URL must be 500 characters or less')
    .optional(),

  /** 'left' | 'center' | 'right' — text alignment in hero */
  alignment: z.enum(['left', 'center', 'right']).default('center'),

  /** overlay opacity 0–100 trên background image */
  overlayOpacity: z.number().int().min(0).max(100).default(40),
});

export type HeroData = z.infer<typeof heroSchema>;
