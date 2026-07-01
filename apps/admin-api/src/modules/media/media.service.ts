import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, renameSync } from 'fs';
import { join, extname, basename } from 'path';
import { pipeline } from 'stream/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';

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
    // Dùng tên file gốc (đã sanitize) làm key thay vì randomUUID, để Media Library
    // hiển thị đúng tên người dùng upload. Trùng tên -> tự thêm hậu tố -1, -2...
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

    return this.prisma.media.create({
      data: {
        key,
        url,
        mimeType: file.mimetype,
      },
    });
  }

  /**
   * Đổi tên hiển thị của media (đồng thời đổi tên file vật lý trên disk và `key`/`url` trong DB).
   * Giữ nguyên phần extension gốc, chỉ đổi phần base name; input đã qua renameMediaSchema.
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

    const oldPath = join(this.uploadDir, media.key);
    const newPath = join(this.uploadDir, newKey);
    if (existsSync(oldPath)) {
      renameSync(oldPath, newPath);
    }

    return this.prisma.media.update({
      where: { id },
      data: { key: newKey, url: `/uploads/${newKey}` },
    });
  }

  async delete(id: string) {
    const media = await this.findOne(id);
    const filePath = join(this.uploadDir, media.key);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    await this.prisma.media.delete({ where: { id } });
    return { deleted: true };
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