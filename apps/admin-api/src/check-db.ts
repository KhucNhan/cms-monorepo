import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const pages = await prisma.page.findMany({
      include: {
        versions: {
          include: {
            blocks: true,
          },
        },
      },
    });

    console.log('=== PAGES IN DB ===');
    for (const p of pages) {
      console.log(`Page: /${p.slug} (ID: ${p.id})`);
      console.log(`  Published Version ID: ${p.publishedVersionId}`);
      console.log(`  Versions count: ${p.versions.length}`);
      for (const v of p.versions) {
        console.log(`    Version ID: ${v.id} (Status: ${v.status}, CreatedAt: ${v.createdAt})`);
        console.log(`      Blocks count: ${v.blocks.length}`);
        for (const b of v.blocks) {
          console.log(`        Block: ${b.type} (ID: ${b.id}, OrderIndex: ${b.orderIndex})`);
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
