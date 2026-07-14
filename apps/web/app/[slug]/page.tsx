import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/blocks';
import { NavbarSwitcher } from '@/components/NavbarSwitcher';
import { getPageBySlug } from '@/lib/pages';

interface PageProps {
  // Route only exposes `slug` — this is the single dynamic segment ([slug]).
  // `title` was never a real param here; removing it avoids a false sense
  // that it's available from routing (it comes from Page.title via the API).
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const sortedBlocks = [...page.blocks].sort((a, b) => a.order - b.order);

  return (
    <main>
      {/* Rendered here (not in layout.tsx) because Edit Mode needs this page's
         own `pageId`/`slug`/`blocks` to open EditModeLayout. layout.tsx only
         keeps AuthProvider — it has no per-page data. */}
      <NavbarSwitcher pageId={page.id} slug={page.slug} initialBlocks={sortedBlocks} />
      {sortedBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  );
}