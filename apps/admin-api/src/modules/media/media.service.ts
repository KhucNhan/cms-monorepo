import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { z } from 'zod';
import { extname, basename } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';
import { ErrorCode } from '@cms/shared-types';
import { getBlockDefinition } from '@cms/block-registry/schema-only';
import { Prisma } from '@prisma/client';
import { optimizeImage, isRasterImage, MEDIA_VARIANT_PRESETS, decideOriginalVariant } from './image-optimizer.util';

export const listMediaSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  mimeType: z.string().optional(),
  search: z.string().optional(),
});

export type ListMediaDto = z.infer<typeof listMediaSchema>;

export const renameMediaSchema = z.object({
  name: z.string().trim().min(1, 'The filename cannot be empty.').max(255),
});

export type RenameMediaDto = z.infer<typeof renameMediaSchema>;

export const updateMediaSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    altText: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.name !== undefined || d.altText !== undefined, {
    message: 'At least one of name or altText must be provided.',
  });

export type UpdateMediaDto = z.infer<typeof updateMediaSchema>;

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
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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

    // Đọc toàn bộ stream vào buffer (thay vì ghi ra disk như bản cũ) —
    // buffer này là input duy nhất cho toàn bộ pipeline optimize + upload lên storage.
    const chunks: Buffer[] = [];
    for await (const chunk of file.file as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const inputBuffer = Buffer.concat(chunks);

    if (inputBuffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'File exceeds maximum size of 10 MB.',
      });
    }

    // ── Sinh 3 variant (original/detail/thumb) — bỏ qua nếu là SVG (vector, giữ nguyên) ──
    // generateVariants() có thể đổi key/url/mimeType của bản "original" nếu quyết định
    // dùng bản optimize WebP thay vì giữ file gốc (xem decideOriginalVariant()).
    const { finalKey, finalUrl, finalMimeType, ...variants } = await this.generateVariants(
      inputBuffer,
      key,
      file.mimetype,
    );

    return this.prisma.media.create({
      data: {
        key: finalKey,
        url: finalUrl,
        mimeType: finalMimeType,
        fileSize: inputBuffer.length,
        ...variants,
      },
    });
  }

  /**
   * Sinh 3 variant (original/detail/thumb) từ ảnh raster vừa upload.
   *
   * - `detail`/`thumb`: luôn convert WebP + ép ≤300KB, upload thẳng lên storage
   *   (naming: `<base>.detail.webp`, `<base>.thumb.webp`) — không đổi logic so với trước,
   *   chỉ đổi đích ghi từ disk local sang `StorageService`.
   * - `original`: áp dụng `decideOriginalVariant()` —
   *     + Size gốc > 300KB, hoặc optimize vẫn nhỏ hơn/bằng gốc → dùng bản optimize WebP,
   *       key đổi đuôi thành `.webp`, upload lên key mới.
   *     + Size gốc <= 300KB VÀ optimize làm TĂNG size → giữ nguyên buffer gốc, key/mimeType
   *       không đổi, upload nguyên buffer gốc lên storage.
   *   Toàn bộ quyết định + số liệu size trước/sau được log lại để audit.
   *
   * Với SVG: trả nguyên `key`/`mimeType` đầu vào, 4 field detail/thumb rỗng (giữ null trong DB)
   * vì SVG là vector, không cần variant.
   */
  private async generateVariants(
    input: Buffer,
    key: string,
    mimeType: string,
  ): Promise<{
    finalKey: string;
    finalUrl: string;
    finalMimeType: string;
    width: number | null;
    height: number | null;
    detailKey?: string;
    detailUrl?: string;
    thumbKey?: string;
    thumbUrl?: string;
  }> {
    if (!isRasterImage(mimeType)) {
      let width: number | null = null;
      let height: number | null = null;
      try {
        const sharp = await import('sharp');
        const meta = await sharp.default(input).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to extract dimensions for SVG ${key}: ${message}`);
      }
      const finalUrl = await this.storage.upload(key, input, mimeType);
      return {
        finalKey: key,
        finalUrl,
        finalMimeType: mimeType,
        width,
        height,
      };
    }

    const ext = extname(key);
    const base = key.replace(ext, '');

    const [detail, thumb] = await Promise.all([
      optimizeImage(input, MEDIA_VARIANT_PRESETS.detail),
      optimizeImage(input, MEDIA_VARIANT_PRESETS.thumb),
    ]);

    const detailKey = `${base}.detail.webp`;
    const thumbKey = `${base}.thumb.webp`;
    const detailUrl = await this.storage.upload(detailKey, detail.buffer, 'image/webp');
    const thumbUrl = await this.storage.upload(thumbKey, thumb.buffer, 'image/webp');

    // ── Variant "original": so sánh size gốc vs size sau optimize, quyết định giữ cái nào ──
    const decision = await decideOriginalVariant(input, mimeType, ext);
    const { originalSizeBytes, optimizedSizeBytes, wasSmallFile, optimizeMadeItBigger } = decision.meta;

    this.logger.log(
      `[upload][original] file="${key}" sizeGốc=${originalSizeBytes}B ` +
      `(${(originalSizeBytes / 1024).toFixed(1)}KB), sizeSauOptimize=${optimizedSizeBytes}B ` +
      `(${(optimizedSizeBytes / 1024).toFixed(1)}KB), wasSmallFile(<=300KB)=${wasSmallFile}, ` +
      `optimizeMadeItBigger=${optimizeMadeItBigger}`,
    );

    let finalKey = key;
    let finalUrl: string;

    if (decision.usedOriginal) {
      // Giữ nguyên buffer gốc — upload thẳng lên key ban đầu, không đổi mimeType/extension.
      this.logger.warn(
        `[upload][original] file="${key}": KEEP the original file because optimizing will INCREASE its size ` +
        `(+${optimizedSizeBytes - originalSizeBytes}B). mimeType/extension không đổi.`,
      );
      finalUrl = await this.storage.upload(key, decision.buffer, mimeType);
    } else {
      const savedBytes = originalSizeBytes - optimizedSizeBytes;
      const savedPercent = originalSizeBytes > 0 ? ((savedBytes / originalSizeBytes) * 100).toFixed(1) : '0';
      this.logger.log(
        `[upload][original] file="${key}": use the optimized WebP version, saving ${savedBytes}B (${savedPercent}%).`,
      );

      finalKey = ext.toLowerCase() === '.webp' ? key : `${base}.webp`;
      finalUrl = await this.storage.upload(finalKey, decision.buffer, 'image/webp');
      // Không có "file gốc trên disk cần xoá" như bản cũ — vì chưa từng ghi input ra disk,
      // chỉ có buffer trong memory, nên không tạo ra object rác nào trên storage cần dọn.
    }

    return {
      finalKey,
      finalUrl,
      finalMimeType: decision.mimeType,
      width: decision.width,
      height: decision.height,
      detailKey,
      detailUrl,
      thumbKey,
      thumbUrl,
    };
  }

  /**
   * Đổi tên hiển thị của media (đồng thời đổi key vật lý trên storage và `key`/`url` trong DB).
   * Đồng bộ đổi tên luôn 2 file variant (detail/thumb) nếu có, giữ nguyên hậu tố `.detail.webp`/`.thumb.webp`.
   *
   * StorageService.rename() thực hiện copy-sang-key-mới + xoá key cũ (S3/MinIO không có
   * "rename" thật như filesystem).
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

    const newUrl = await this.storage.rename(media.key, newKey);
    const data: Record<string, string> = { key: newKey, url: newUrl };

    if (media.detailKey) {
      const newDetailKey = media.detailKey.replace(oldBase, newBase);
      data.detailUrl = await this.storage.rename(media.detailKey, newDetailKey);
      data.detailKey = newDetailKey;
    }
    if (media.thumbKey) {
      const newThumbKey = media.thumbKey.replace(oldBase, newBase);
      data.thumbUrl = await this.storage.rename(media.thumbKey, newThumbKey);
      data.thumbKey = newThumbKey;
    }

    return this.prisma.media.update({ where: { id }, data });
  }

  /**
   * Update metadata (name và/hoặc altText) trong 1 lần ghi DB duy nhất.
   *
   * - Nếu `dto.name` có: chạy toàn bộ rename logic (sanitize → unique key → rename trên storage)
   *   để tính bộ `key`/`url`/`detailKey`/... mới — nhưng KHÔNG ghi DB trong lúc rename, chỉ build `data`.
   *   Sau đó merge `altText` (nếu có) vào `data` cùng lúc, gọi `prisma.media.update()` 1 lần.
   * - Nếu chỉ `dto.altText`: cập nhật 1 field, 1 round-trip DB.
   */
  async update(id: string, dto: UpdateMediaDto) {
    const media = await this.findOne(id);
    const updateData: Record<string, string | null> = {};

    if (dto.name !== undefined) {
      const ext = extname(media.key);
      const rawBase = this.stripExtension(dto.name, ext);
      const sanitizedBase = this.sanitizeFilename(rawBase);
      if (!sanitizedBase) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'The filename is invalid after sanitization.',
        });
      }

      const newKey = await this.generateUniqueKey(`${sanitizedBase}${ext}`, ext, id);
      if (newKey !== media.key) {
        const oldBase = media.key.replace(ext, '');
        const newBase = newKey.replace(ext, '');

        // Rename trên storage (copy + delete) — không phải DB write
        updateData.url = await this.storage.rename(media.key, newKey);
        updateData.key = newKey;

        if (media.detailKey) {
          const newDetailKey = media.detailKey.replace(oldBase, newBase);
          updateData.detailUrl = await this.storage.rename(media.detailKey, newDetailKey);
          updateData.detailKey = newDetailKey;
        }
        if (media.thumbKey) {
          const newThumbKey = media.thumbKey.replace(oldBase, newBase);
          updateData.thumbUrl = await this.storage.rename(media.thumbKey, newThumbKey);
          updateData.thumbKey = newThumbKey;
        }
      }
    }

    if (dto.altText !== undefined) {
      // Cho phép xoá altText bằng chuỗi rỗng (lưu null vào DB)
      updateData.altText = dto.altText.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      // Không có gì thay đổi (ví dụ name trùng key cũ, altText không có)
      return media;
    }

    // 1 lần write DB duy nhất — tránh 2 round-trip và race condition
    return this.prisma.media.update({ where: { id }, data: updateData });
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

    const deleteAllVariantFiles = async () => {
      for (const k of [media.key, media.detailKey, media.thumbKey]) {
        if (!k) continue;
        await this.storage.delete(k);
      }
    };

    if (usages.length > 0) {
      // Lưu ý: deleteAllVariantFiles() (gọi storage) nằm TRONG transaction Prisma như bản gốc —
      // nếu transaction rollback (parse lỗi ở 1 block), các lệnh xoá trên storage đã gọi
      // trước đó KHÔNG tự rollback theo (S3/MinIO không tham gia transaction DB). Đây là hành vi
      // giữ nguyên y hệt bản cũ (fs cũng không transactional với Prisma) — không phải regression
      // mới, chỉ ghi chú lại vì đổi sang network I/O khiến rủi ro này rõ ràng hơn trước.
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

        await deleteAllVariantFiles();
        await tx.media.delete({ where: { id } });
      });

      return { deleted: true, strippedFromBlocks: usages.length };
    }

    await deleteAllVariantFiles();
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