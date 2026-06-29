import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/blocks';
import { getPageBySlug } from '@/lib/pages';

export default async function HomePage() {
  const page = await getPageBySlug('homepage');
  if (!page) notFound();

  const sortedBlocks = [...page.blocks].sort((a, b) => a.order - b.order);

  return (
    <main>
      {sortedBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  );
}
