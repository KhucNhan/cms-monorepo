import { heroSchema, type HeroData } from './schema';
import type { BlockDefinition } from '../../types';
import { HeroEditor } from './Editor';

export const heroBlock: BlockDefinition<typeof heroSchema> = {
  type: 'hero',
  label: 'Hero Section',
  icon: 'LayoutTemplate',
  schema: heroSchema,
  thumbnail: '/block-thumbnails/hero.png',
  defaultData: {
    title: 'Your compelling headline here',
    subtitle: 'Supporting text that adds context',
    image: { mediaId: '', alt: '' },
    buttonText: 'Get Started',
    buttonHref: '',
    alignment: 'center',
    overlayOpacity: 40,
  } satisfies HeroData,
  Editor: HeroEditor,
};

export { heroSchema, type HeroData };
