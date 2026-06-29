import { revalidateTag } from 'next/cache';

export async function POST(req: Request) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tags } = (await req.json()) as { tags?: string[] };
  if (!Array.isArray(tags)) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  tags.forEach((tag) => revalidateTag(tag));

  return Response.json({ revalidated: true, tags });
}
