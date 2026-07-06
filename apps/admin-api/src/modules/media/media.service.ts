import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { z } from 'zod';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { pipeline } from 'stream/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';
import { getBlockDefinition } from '@cms/block-registry/schema-only';
import { PrismaClient, Prisma } from '@prisma/client';
import { optimizeImage, isRasterImage, MEDIA_VARIANT_PRESETS } from './image-optimizer.util';

export const listMediaSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  mimeType: z.string().optional(),
  search: z.string().optional(),
});

export type ListMediaDto = z.infer<typeof listMediaSchema>;

export const renameMediaSchema = z.object({
  name: z.string().trim().min(1, 'Tên file không được để trống.').max(255),
});

export type RenameMediaDto = z.infer<typeof renameMediaSchema>;

export interface MediaUsageInfo {
  blockId: string;
  blockType: string;
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  pageVersionId: string;
  pageVersionStatus: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class MediaService {
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async findAll(params: ListMediaDto) {
    const { page, pageSize, mimeType, search } = params;
    const skip = (page - 1) * pageSize;
    const where: { mimeType?: { startsWith: string }; key?: { contains: string; mode: 'insensitive' } } = {};
    if (mimeType) where.mimeType = { startsWith: mimeType };
    const trimmedSearch = search?.trim();
    if (trimmedSearch) where.key = { contains: trimmedSearch, mode: 'insensitive' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, pageSize, hasNextPage: skip + pageSize < total },
    };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: `Media not found: ${id}`,
      });
    }
    return media;
  }

  async upload(file: {
    filename: string;
    mimetype: string;
    file: NodeJS.ReadableStream;
  }) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, GIF, WebP, SVG.`,
      });
    }

    const ext = extname(file.filename) || this.extFromMime(file.mimetype);
    const key = await this.generateUniqueKey(file.filename, ext);
    const filePath = join(this.uploadDir, key);

    await pipeline(file.file, createWriteStream(filePath));

    const stats = await import('fs/promises').then((fs) => fs.stat(filePath));
    if (stats.size > MAX_FILE_SIZE) {
      unlinkSync(filePath);
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'File exceeds maximum size of 10 MB.',
      });
    }

    const url = `/uploads/${key}`;

    // ── Sinh 3 variant (original/detail/thumb) — bỏ qua nếu là SVG (vector, giữ nguyên) ──
    const variants = await this.generateVariants(filePath, key, file.mimetype);

    return this.prisma.media.create({
      data: {
        key,
        url,
        mimeType: file.mimetype,
        ...variants,
      },
    });
  }

  /**
   * Sinh 3 file webp (original/detail/thumb) từ ảnh raster vừa upload, ghi ra disk cạnh file gốc
   * (naming: `<base>.original.webp`, `<base>.detail.webp`, `<base>.thumb.webp`), trả về object
   * để merge trực tiếp vào Prisma `create`/`update`.
   *
   * Với SVG: trả object rỗng (giữ 4 field null trong DB) vì SVG là vector, không cần variant.
   */
  private async generateVariants(
    sourceFilePath: string,
    key: string,
    mimeType: string,
  ): Promise<{ detailKey?: string; detailUrl?: string; thumbKey?: string; thumbUrl?: string }> {
    if (!isRasterImage(mimeType)) return {};

    const base = key.replace(extname(key), '');
    const input = readFileSync(sourceFilePath);

    const [detail, thumb] = await Promise.all([
      optimizeImage(input, MEDIA_VARIANT_PRESETS.detail),
      optimizeImage(input, MEDIA_VARIANT_PRESETS.thumb),
    ]);

    const detailKey = `${base}.detail.webp`;
    const thumbKey = `${base}.thumb.webp`;
    writeFileSync(join(this.uploadDir, detailKey), detail.buffer);
    writeFileSync(join(this.uploadDir, thumbKey), thumb.buffer);

    // Variant "original": cũng convert sang WebP + strip metadata (không ép targetBytes),
    // GHI ĐÈ lên chính file gốc để tiết kiệm dung lượng disk (đã thống nhất: original cũng
    // được tối ưu, không giữ file upload thô 100%).
    const original = await optimizeImage(input, MEDIA_VARIANT_PRESETS.original);
    writeFileSync(sourceFilePath, original.buffer);

    return {
      detailKey,
      detailUrl: `/uploads/${detailKey}`,
      thumbKey,
      thumbUrl: `/uploads/${thumbKey}`,
    };
  }

  /**
   * Đổi tên hiển thị của media (đồng thời đổi tên file vật lý trên disk và `key`/`url` trong DB).
   * Đồng bộ đổi tên luôn 2 file variant (detail/thumb) nếu có, giữ nguyên hậu tố `.detail.webp`/`.thumb.webp`.
   */
  async rename(id: string, newNameRaw: string) {
    const media = await this.findOne(id);
    const ext = extname(media.key);

    const rawBase = this.stripExtension(newNameRaw, ext);
    const sanitizedBase = this.sanitizeFilename(rawBase);
    if (!sanitizedBase) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Tên file không hợp lệ sau khi chuẩn hoá.',
      });
    }

    const newKey = await this.generateUniqueKey(`${sanitizedBase}${ext}`, ext, id);
    if (newKey === media.key) {
      return media;
    }

    const oldBase = media.key.replace(ext, '');
    const newBase = newKey.replace(ext, '');

    this.renamePhysicalFile(media.key, newKey);
    const data: Record<string, string> = { key: newKey, url: `/uploads/${newKey}` };

    if (media.detailKey) {
      const newDetailKey = media.detailKey.replace(oldBase, newBase);
      this.renamePhysicalFile(media.detailKey, newDetailKey);
      data.detailKey = newDetailKey;
      data.detailUrl = `/uploads/${newDetailKey}`;
    }
    if (media.thumbKey) {
      const newThumbKey = media.thumbKey.replace(oldBase, newBase);
      this.renamePhysicalFile(media.thumbKey, newThumbKey);
      data.thumbKey = newThumbKey;
      data.thumbUrl = `/uploads/${newThumbKey}`;
    }

    return this.prisma.media.update({ where: { id }, data });
  }

  private renamePhysicalFile(oldKey: string, newKey: string) {
    const oldPath = join(this.uploadDir, oldKey);
    const newPath = join(this.uploadDir, newKey);
    if (existsSync(oldPath)) renameSync(oldPath, newPath);
  }

  async getUsages(id: string): Promise<MediaUsageInfo[]> {
    await this.findOne(id); // 404 nếu media không tồn tại
    return this.findUsages(id);
  }

  async delete(id: string, force = false) {
    const media = await this.findOne(id);
    const usages = await this.findUsages(media.id);

    if (usages.length > 0 && !force) {
      throw new ConflictException({
        code: ErrorCode.MEDIA_IN_USE,
        message: `Media is currently used in ${usages.length} block(s).`,
        details: usages,
      });
    }

    const deleteAllVariantFiles = () => {
      for (const k of [media.key, media.detailKey, media.thumbKey]) {
        if (!k) continue;
        const p = join(this.uploadDir, k);
        if (existsSync(p)) unlinkSync(p);
      }
    };

    if (usages.length > 0) {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const usage of usages) {
          const block = await tx.block.findUnique({ where: { id: usage.blockId } });
          if (!block) continue;

          const strippedData = this.stripMediaReference(block.data, media.id);

          const definition = getBlockDefinition(block.type);
          const parsed = definition.schema.safeParse(strippedData);
          if (!parsed.success) {
            throw new BadRequestException({
              code: ErrorCode.VALIDATION_ERROR,
              message: `Cannot remove media reference from block ${block.id} (${block.type}): resulting data is invalid.`,
              details: parsed.error.flatten(),
            });
          }

          await tx.block.update({ where: { id: block.id }, data: { data: parsed.data } });
        }

        deleteAllVariantFiles();
        await tx.media.delete({ where: { id } });
      });

      return { deleted: true, strippedFromBlocks: usages.length };
    }

    deleteAllVariantFiles();
    await this.prisma.media.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Quét mọi block có object con dạng `{ mediaId: <id>, ... }` (hiện tại chỉ
   * `hero.image` khớp shape này, nhưng không hardcode `type === 'hero'` ở đây
   * để block type khác thêm media reference sau này không cần sửa lại chỗ này —
   * chỉ cần theo đúng convention field tên `mediaId` trong schema.ts của block đó).
   * Lấy usage bất kể pageVersion.status (DRAFT/PUBLISHED/ARCHIVED).
   *
   * LƯU Ý TỐI ƯU CÒN THIẾU (chưa làm trong lần sửa này, ghi lại để task sau):
   * hàm này vẫn load toàn bộ block trong DB rồi lọc bằng JS — nên chuyển sang
   * Postgres JSONB query (`data @> ...`) để lọc ngay ở DB khi cần tối ưu hiệu năng thêm.
   */
  private async findUsages(mediaId: string): Promise<MediaUsageInfo[]> {
    const blocks = await this.prisma.block.findMany({
      include: { pageVersion: { include: { page: true } } },
    });

    const usages: MediaUsageInfo[] = [];
    for (const block of blocks) {
      if (this.containsMediaId(block.data, mediaId)) {
        const seoMeta = block.pageVersion.seoMeta as { title?: string } | null;
        usages.push({
          blockId: block.id,
          blockType: block.type,
          pageId: block.pageVersion.page.id,
          pageTitle: seoMeta?.title?.trim() || block.pageVersion.page.slug,
          pageSlug: block.pageVersion.page.slug,
          pageVersionId: block.pageVersion.id,
          pageVersionStatus: block.pageVersion.status,
        });
      }
    }
    return usages;
  }

  /** Đệ quy: true nếu tìm thấy object con nào có `mediaId === targetId`. */
  private containsMediaId(value: unknown, targetId: string): boolean {
    if (Array.isArray(value)) {
      return value.some((v) => this.containsMediaId(v, targetId));
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.mediaId === 'string' && obj.mediaId === targetId) return true;
      return Object.values(obj).some((v) => this.containsMediaId(v, targetId));
    }
    return false;
  }

  /**
   * Đệ quy clone `data`; với object con nào có `mediaId === targetId`, gỡ
   * reference bằng cách set `mediaId: ''` và bỏ `url` (nếu có) — KHÔNG null
   * hoá cả object cha, vì field như `hero.image` là required trong Zod schema
   * (`z.object({...})` không `.optional()`), null sẽ làm safeParse fail.
   */
  private stripMediaReference(value: unknown, targetId: string): unknown {
    if (Array.isArray(value)) {
      return value.map((v) => this.stripMediaReference(v, targetId));
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.mediaId === 'string' && obj.mediaId === targetId) {
        const { url, ...rest } = obj;
        return { ...rest, mediaId: '' };
      }
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = this.stripMediaReference(v, targetId);
      }
      return out;
    }
    return value;
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };
    return map[mime] ?? '';
  }

  /** Loại bỏ extension khỏi tên file (nếu có), giữ lại phần base name thô. */
  private stripExtension(name: string, ext: string): string {
    const base = basename(name);
    if (ext && base.toLowerCase().endsWith(ext.toLowerCase())) {
      return base.slice(0, base.length - ext.length);
    }
    return base.replace(/\.[^.]+$/, '');
  }

  /** Chuẩn hoá tên file: bỏ dấu tiếng Việt, ký tự đặc biệt, khoảng trắng -> dấu gạch ngang. */
  private sanitizeFilename(name: string): string {
    return name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 100);
  }

  /**
   * Sinh key duy nhất từ tên file gốc. Nếu trùng với record khác trong DB,
   * tự thêm hậu tố -1, -2... `excludeId` dùng khi rename để không tự đụng chính nó.
   */
  private async generateUniqueKey(originalFilename: string, ext: string, excludeId?: string): Promise<string> {
    const rawBase = this.stripExtension(originalFilename, ext);
    const base = this.sanitizeFilename(rawBase) || 'file';

    let candidate = `${base}${ext}`;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (
      await this.prisma.media.findFirst({
        where: excludeId ? { key: candidate, id: { not: excludeId } } : { key: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix}${ext}`;
      suffix += 1;
    }
    return candidate;
  }
}