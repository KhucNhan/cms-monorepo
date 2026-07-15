import { faqSchema, type FaqData } from './schema';
import type { BlockDefinition } from '../../types';

export const faqBlock: BlockDefinition<typeof faqSchema> = {
  type: 'faq',
  label: 'FAQ',
  icon: 'HelpCircle',
  schema: faqSchema,
  thumbnail: '/block-thumbnails/faq.png',
  defaultData: {
    heading: 'Frequently Asked Questions',
    items: [
      {
        question: 'What is your return policy?',
        answer: 'We offer a 30-day return policy on all items.',
      },
    ],
    allowMultipleOpen: false,
  } satisfies FaqData,
};

export { faqSchema, type FaqData };
