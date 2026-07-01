import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';

export const listMediaSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  mimeType: z.string().optional(),
  search: z.string().optional(),
});

export type ListMediaDto = z.infer<typeof listMediaSchema>;

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
    const key = `${randomUUID()}${ext}`;
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
}
