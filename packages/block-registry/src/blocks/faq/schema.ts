import { z } from 'zod';

const faqItemSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(300, 'Question must be 300 characters or less'),
  answer: z
    .string()
    .min(1, 'Answer is required')
    .max(2000, 'Answer must be 2000 characters or less'),
});

export const faqSchema = z.object({
  heading: z
    .string()
    .max(120, 'Heading must be 120 characters or less')
    .optional(),

  /** Mảng object {question, answer} — không dùng hai mảng song song vì mất liên kết */
  items: z
    .array(faqItemSchema)
    .min(1, 'At least one FAQ item is required')
    .max(20, 'Maximum 20 FAQ items'),

  /** Cho phép mở nhiều item cùng lúc hay chỉ một */
  allowMultipleOpen: z.boolean().default(false),
});

export type FaqData = z.infer<typeof faqSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
