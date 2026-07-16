// apps/admin-api/prisma/migrate-media-to-storage.ts

/**
 * One-off migration — chạy ngày 2026-07-16.
 * Đã chạy thành công trên production: toàn bộ media (bao gồm thumb) đã lên MinIO.
 * KHÔNG chạy lại trừ khi restore DB cũ hoặc cố ý re-migrate — script hiện chưa
 * idempotent (chạy lại có thể tạo trùng object trên MinIO).
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { StorageService } from '../src/modules/media/storage.service';

const prisma = new PrismaClient();
const storage = new StorageService();
const OLD_UPLOAD_DIR = join(process.cwd(), 'uploads'); // thư mục local cũ

async function main() {
  const items = await prisma.media.findMany();
  for (const item of items) {
    for (const [keyField, urlField] of [['key', 'url'], ['detailKey', 'detailUrl'], ['thumbKey', 'thumbUrl']] as const) {
      const key = item[keyField] as string | null;
      if (!key) continue;
      const localPath = join(OLD_UPLOAD_DIR, key);
      try {
        const buffer = readFileSync(localPath);
        const newUrl = await storage.upload(key, buffer, item.mimeType);
        await prisma.media.update({ where: { id: item.id }, data: { [urlField]: newUrl } });
        console.log(`✓ ${key}`);
      } catch (err) {
        console.error(`✗ ${key}:`, err);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());