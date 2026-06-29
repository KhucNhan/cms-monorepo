import Link from 'next/link';
import { getPublishedPages } from '@/lib/pages';

function pageHref(slug: string): string {
  return slug === 'homepage' ? '/' : `/${slug}`;
}

export async function Navbar() {
  const pages = await getPublishedPages();

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-gray-900 hover:text-gray-600">
          Home
        </Link>
        {pages
          .filter((page) => page.slug !== 'homepage')
          .map((page) => (
            <Link
              key={page.id}
              href={pageHref(page.slug)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {page.title}
            </Link>
          ))}
      </nav>
    </header>
  );
}
