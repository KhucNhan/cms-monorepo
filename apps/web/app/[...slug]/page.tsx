import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/blocks';
import { NavbarSwitcher } from '@/components/NavbarSwitcher';
import { getPageBySegments } from '@/lib/pages';

interface PageProps {
  // Catch-all: 1 segment = static page (/about), 2 segments = template page
  // (/projects/agas).
  params: Promise<{ slug: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params;
  const page = await getPageBySegments(segments);
  if (!page) notFound();

  const sortedBlocks = [...page.blocks].sort((a, b) => a.order - b.order);

  // Full path string ("projects/agas" or "about") — passed as the `slug`
  // prop into NavbarSwitcher/AdminNavbar, which only use it for display
  // (`/${slug}` badge) and as a display-only value forwarded to
  // EditModeLayout. No prop rename needed: both components already accept
  // an arbitrary string here, not specifically a single-segment slug.
  const displayPath = segments.join('/');

  return (
    <main>
      <NavbarSwitcher pageId={page.id} slug={displayPath} initialBlocks={sortedBlocks} />
      {sortedBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  );
}