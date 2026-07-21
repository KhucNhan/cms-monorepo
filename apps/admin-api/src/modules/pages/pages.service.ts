import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';
import { getBlockDefinition } from '@cms/block-registry';
import { resolveAutoFill } from './template-autofill.util';

// Marker-only placeholder types are NEVER cloned into real Page.Block rows.
// They exist purely to mark structural positions in a Template layout
// (content-outlet = "page's own free blocks go here", next-project =
// "next-project link goes here") — both are resolved dynamically at
// read-time (mergeTemplateWithPage / resolveNextProject), never persisted
// as an editable Block belonging to the page. Cloning them creates a
// meaningless "content-outlet Block with empty JSON data" card in Content
// Management — this was the bug.
const MARKER_ONLY_PLACEHOLDER_TYPES = new Set(['content-outlet', 'next-project']);

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
  // ── New: filter pages by template ──
  // - templateId provided  → only pages belonging to that template
  // - templateId omitted   → only STATIC pages (templateId = null)
  //   (matches Sidebar's "Pages" nav item, which must exclude template pages)
  templateId: z.string().uuid().optional(),
});

export type CreatePageDto = z.infer<typeof createPageSchema>;
export type UpdatePageDto = z.infer<typeof updatePageSchema>;

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; pageSize: number; search?: string; templateId?: string }) {
    const { page, pageSize, search, templateId } = params;
    const skip = (page - 1) * pageSize;
    const trimmedSearch = search?.trim();

    const where = {
      // No templateId in query → static pages only (templateId IS NULL)
      templateId: templateId ?? null,
      ...(trimmedSearch
        ? { slug: { contains: trimmedSearch, mode: 'insensitive' as const } }
        : {}),
    };

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
    const existing = dto.templateId
      ? await this.prisma.page.findUnique({
          where: { page_template_slug_unique: { templateId: dto.templateId, slug: dto.slug } },
        })
      : await this.prisma.page.findFirst({
          where: { slug: dto.slug, templateId: null },
        });

    if (existing) {
      throw new ConflictException({ code: ErrorCode.CONFLICT, message: `Slug already exists: ${dto.slug}` });
    }

    let placeholders: Awaited<ReturnType<typeof this.prisma.templatePlaceholder.findMany>> = [];
    if (dto.templateId) {
      const template = await this.prisma.template.findUnique({ where: { id: dto.templateId } });
      if (!template) {
        throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: `Template not found: ${dto.templateId}` });
      }
      placeholders = await this.prisma.templatePlaceholder.findMany({
        where: { templateId: dto.templateId },
        orderBy: { orderIndex: 'asc' },
      });
    }

    // $transaction (interactive) instead of the previous nested `page.create`,
    // because Phase C needs the DRAFT version's id to attach auto-filled
    // Block rows — a single nested create can't give us that id mid-write.
    return this.prisma.$transaction(async (tx) => {
      try {
        const page = await tx.page.create({
        data: {
          slug: dto.slug,
          title: dto.title ?? '',
          templateId: dto.templateId ?? null,
          versions: {
            create: { status: 'DRAFT', seoMeta: dto.seoMeta ?? {}, createdBy },
          },
        },
        include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      const draft = page.versions[0];
      if (!draft) {
        // Unreachable — nested create always produces exactly one DRAFT version.
        throw new Error('Expected a DRAFT version to be created alongside the page');
      }

      const MARKER_ONLY_PLACEHOLDER_TYPES = new Set(['content-outlet', 'next-project']);

      for (const placeholder of placeholders) {
        if (MARKER_ONLY_PLACEHOLDER_TYPES.has(placeholder.type)) continue;

        let definition;
        try {
          definition = getBlockDefinition(placeholder.type);
        } catch {
          continue;
        }

        const filledData = resolveAutoFill(
          definition.defaultData,
          placeholder.autoFillMap as Record<string, string> | null,
          page,
        );
        const parsed = definition.schema.parse(filledData);

        await tx.block.create({
          data: {
            pageVersionId: draft.id, // giờ TS biết chắc draft không undefined
            type: placeholder.type,
            orderIndex: placeholder.orderIndex,
            data: parsed,
          },
        });
      }

      return tx.page.findUniqueOrThrow({
        where: { id: page.id },
        include: {
          publishedVersion: { select: { id: true, status: true, updatedAt: true, seoMeta: true } },
          _count: { select: { versions: true } },
          versions: { orderBy: { createdAt: 'desc' }, take: 1, include: { blocks: { orderBy: { orderIndex: 'asc' } } } },
        },
      });
      } catch (error) {
        console.error('[PagesService.create] RAW ERROR:', error);
        throw error;
      }
    });
  }

  async update(id: string, dto: UpdatePageDto) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Page not found' });

    if (dto.slug && dto.slug !== page.slug) {
      // Use page.templateId (from the fetched row), NOT dto.templateId —
      // updatePageSchema has no templateId field: a page's template binding
      // is immutable after creation, only slug/title can be patched here.
      const conflict = page.templateId
        ? await this.prisma.page.findUnique({
            where: { page_template_slug_unique: { templateId: page.templateId, slug: dto.slug } },
          })
        : await this.prisma.page.findFirst({
            where: { slug: dto.slug, templateId: null },
          });

      if (conflict) {
        throw new ConflictException({ code: ErrorCode.CONFLICT, message: `Slug already exists: ${dto.slug}` });
      }
    }

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