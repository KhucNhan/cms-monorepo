import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/blocks';
import { getPageBySlug } from '@/lib/pages';

interface PageProps {
  params: Promise<{ slug: string, title: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug, title } = await params;
  const page = await getPageBySlug(slug);
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
