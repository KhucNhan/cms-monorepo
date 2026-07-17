import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';

// ── Input schemas ─────────────────────────────────────────

export const createPageSchema = z.object({
  slug: z
    .string().min(1).max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  // Page.title: tên hiển thị của trang, tách biệt hoàn toàn với seoMeta.title (thẻ SEO <title>).
  title: z.string().max(100).optional().default(''),
  seoMeta: z.object({
    title:       z.string().max(60).optional(),
    description: z.string().max(160).optional(),
    ogImage:     z.string().url().optional(),
    noIndex:     z.boolean().optional(),
  }).optional().default({}),
  templateId: z.string().uuid().optional(),
});

export const updatePageSchema = z.object({
  slug: z.string().min(1).max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title: z.string().max(100).optional(),
});

export const listPagesSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search:   z.string().optional(),
});

export type CreatePageDto = z.infer<typeof createPageSchema>;
export type UpdatePageDto = z.infer<typeof updatePageSchema>;

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; pageSize: number; search?: string }) {
    const { page, pageSize, search } = params;
    const skip = (page - 1) * pageSize;
    const trimmedSearch = search?.trim();
    const where = trimmedSearch
      ? { slug: { contains: trimmedSearch, mode: 'insensitive' as const } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.page.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          publishedVersion: { select: { id: true, status: true, updatedAt: true, seoMeta: true } },
          _count: { select: { versions: true } },
        },
      }),
      this.prisma.page.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, pageSize, hasNextPage: skip + pageSize < total },
    };
  }

  async findByIdOrSlug(idOrSlug: string) {
    const page = await this.prisma.page.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        publishedVersion: {
          include: { blocks: { orderBy: { orderIndex: 'asc' } } },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, status: true, createdAt: true, createdBy: true },
        },
      },
    });

    if (!page) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: `Page not found: ${idOrSlug}` });
    }
    return page;
  }

  async create(dto: CreatePageDto, createdBy: string) {
    const existing = await this.prisma.page.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException({ code: ErrorCode.CONFLICT, message: `Slug already exists: ${dto.slug}` });
    }

    if (dto.templateId) {
      const templateExists = await this.prisma.template.findUnique({ where: { id: dto.templateId } });
      if (!templateExists) {
        throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: `Template not found: ${dto.templateId}` });
      }
    }

    return this.prisma.page.create({
      data: {
        slug: dto.slug,
        title: dto.title ?? '',
        templateId: dto.templateId ?? null,
        versions: {
          create: {
            status: 'DRAFT',
            seoMeta: dto.seoMeta ?? {},
            createdBy,
          },
        },
      },
      include: {
        publishedVersion: { select: { id: true, status: true, updatedAt: true, seoMeta: true } },
        _count: { select: { versions: true } },
        versions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async update(id: string, dto: UpdatePageDto) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Page not found' });

    if (dto.slug && dto.slug !== page.slug) {
      const conflict = await this.prisma.page.findUnique({ where: { slug: dto.slug } });
      if (conflict) {
        throw new ConflictException({ code: ErrorCode.CONFLICT, message: `Slug already exists: ${dto.slug}` });
      }
    }

    // title là thuộc tính của Page (không versioned), có thể update trực tiếp bất kể
    // trạng thái DRAFT/PUBLISHED của version hiện tại — khác với slug (cũng ở Page nhưng
    // theo quy ước hiện tại lưu trực tiếp) và seoMeta (thuộc PageVersion, phải qua draft).
    return this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
      },
    });
  }

  async delete(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Page not found' });
    await this.prisma.page.delete({ where: { id } });
    return { deleted: true };
  }

  /** Clone version thành DRAFT mới để editor không chạm bản live */
  async createDraftVersion(pageId: string, fromVersionId: string, createdBy: string) {
    const source = await this.prisma.pageVersion.findFirst({
      where: { id: fromVersionId, pageId },
      include: { blocks: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!source) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Source version not found' });
    }

    return this.prisma.pageVersion.create({
      data: {
        pageId,
        status: 'DRAFT',
        seoMeta: source.seoMeta as object,
        createdBy,
        blocks: {
          createMany: {
            data: source.blocks.map((b: (typeof source.blocks)[number]) => ({
              type: b.type,
              orderIndex: b.orderIndex,
              data: b.data as object,
            })),
          },
        },
      },
      include: { blocks: { orderBy: { orderIndex: 'asc' } } },
    });
  }
}