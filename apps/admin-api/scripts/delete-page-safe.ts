// scripts/delete-page-safe.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deletePageSafely(pageId: string) {
  await prisma.$transaction(async (tx) => {
    // 1. Find all versions of this page
    const versions = await tx.pageVersion.findMany({
      where: { pageId },
      select: { id: true },
    });
    const versionIds = versions.map((v) => v.id);

    // 2. Delete blocks belonging to those versions first (deepest child)
    await tx.block.deleteMany({
      where: { pageVersionId: { in: versionIds } },
    });

    // 3. Clear the publishedVersionId pointer on Page BEFORE deleting versions
    //    (Page.publishedVersionId has an FK into PageVersion — must null it first
    //    or the delete below will fail with the same constraint error)
    await tx.page.update({
      where: { id: pageId },
      data: { publishedVersionId: null },
    });

    // 4. Now safe to delete all page versions
    await tx.pageVersion.deleteMany({
      where: { pageId },
    });

    // 5. Finally delete the page itself
    await tx.page.delete({
      where: { id: pageId },
    });
  });

  console.log(`Page ${pageId} deleted successfully.`);
}

const pageId = process.argv[2];
if (!pageId) {
  console.error('Usage: ts-node scripts/delete-page-safe.ts <pageId>');
  process.exit(1);
}

deletePageSafely(pageId)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());