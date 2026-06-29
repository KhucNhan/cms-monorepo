import { clsx } from 'clsx';
import type { HeroBlockData } from '@/types';

interface Props {
  data: HeroBlockData;
}

export function HeroBlock({ data }: Props) {
  const {
    title,
    subtitle,
    alignment = 'center',
    buttonText,
    buttonHref = '#',
    overlayOpacity = 0,
  } = data;

  return (
    <section
      className={clsx(
        'relative w-full bg-gray-900 text-white',
        'flex flex-col items-center justify-center',
        'px-6 py-24 min-h-[480px]',
        alignment === 'left' && 'items-start text-left',
        alignment === 'right' && 'items-end text-right',
        alignment === 'center' && 'items-center text-center',
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity / 100 }}
      />

      <div className="relative z-10 max-w-3xl w-full">
        <h1 className="text-4xl font-bold leading-tight tracking-tight mb-4">
          {title}
        </h1>

        {subtitle && (
          <p className="text-lg text-white/80 mb-8 max-w-xl">{subtitle}</p>
        )}

        {buttonText && (
          <a
            href={buttonHref}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            {buttonText}
          </a>
        )}
      </div>
    </section>
  );
}
