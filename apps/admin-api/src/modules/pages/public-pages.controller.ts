import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Page, PageVersion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';

type PageWithTemplateAndVersion = Prisma.PageGetPayload<{
  include: {
    template: { include: { placeholders: true } };
    publishedVersion: { include: { blocks: true } };
  };
}>;

@ApiTags('public')
@Controller('public/pages')
export class PublicPagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocksService: BlocksService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all published pages (for sitemap / nav)' })
  async listPublished() {
    const pages = await this.prisma.page.findMany({
      where: { publishedVersionId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        publishedVersion: { select: { seoMeta: true } },
      },
    });

    return pages.map((page: (typeof pages)[number]) => {
      const seoMeta = (page.publishedVersion?.seoMeta ?? {}) as Record<string, unknown>;
      return {
        id: page.id,
        slug: page.slug,
        title: page.title || (seoMeta['title'] as string | undefined) || page.slug,
      };
    });
  }

  /** Static page (no Template) — e.g. /about, /homepage */
  @Get(':slug')
  @ApiOperation({ summary: 'Get a published STATIC page by slug (no template)' })
  async getStaticBySlug(@Param('slug') slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug, templateId: null },
      include: {
        template: { include: { placeholders: { orderBy: { orderIndex: 'asc' } } } },
        publishedVersion: { include: { blocks: { orderBy: { orderIndex: 'asc' } } } },
      },
    });

    return this.buildResponse(page, slug);
  }

  /** Template-bound page — e.g. /projects/agas (slugPrefix = "projects") */
  @Get(':slugPrefix/:slug')
  @ApiOperation({ summary: 'Get a published TEMPLATE page by slugPrefix + slug' })
  async getTemplateBySlug(
    @Param('slugPrefix') slugPrefix: string,
    @Param('slug') slug: string,
  ) {
    const template = await this.prisma.template.findUnique({ where: { slugPrefix } });
    if (!template) {
      throw new NotFoundException(`Template not found for prefix: ${slugPrefix}`);
    }

    const page = await this.prisma.page.findUnique({
      where: { page_template_slug_unique: { templateId: template.id, slug } },
      include: {
        template: { include: { placeholders: { orderBy: { orderIndex: 'asc' } } } },
        publishedVersion: { include: { blocks: { orderBy: { orderIndex: 'asc' } } } },
      },
    });

    return this.buildResponse(page, `${slugPrefix}/${slug}`);
  }

  /**
   * Shared response-building logic (merge template blocks, resolve
   * next-project, enrich media) — kept in one place so getStaticBySlug and
   * getTemplateBySlug never drift apart in behavior.
   */
  private async buildResponse(page: PageWithTemplateAndVersion | null, debugPath: string) {
    if (!page || !page.publishedVersion) {
      throw new NotFoundException(`Page not found or not published: ${debugPath}`);
    }

    const seoMeta = (page.publishedVersion.seoMeta ?? {}) as Record<string, unknown>;

    let rawBlocks = page.publishedVersion.blocks;
    if (page.template) {
      const { mergeTemplateWithPage } = await import('../templates/template-merge.util');
      rawBlocks = mergeTemplateWithPage(page.template.placeholders, rawBlocks);
    }

    const hasNextProjectPlaceholder = page.template?.placeholders.some(
      (p) => p.type === 'next-project',
    );
    const nextPage = hasNextProjectPlaceholder && page.templateId
      ? await this.resolveNextProject(page.templateId, page.id)
      : null;

    const blocks = await Promise.all(
      rawBlocks.map(async (b) => {
        const enrichedData =
          b.type === 'next-project'
            ? { nextPage }
            : await this.blocksService.enrichBlockData(b.type, b.data);

        return { id: b.id, type: b.type, order: b.orderIndex, data: enrichedData };
      }),
    );

    return {
      id: page.id,
      slug: page.slug,
      slugPrefix: page.template?.slugPrefix ?? null,
      title: page.title || (seoMeta['title'] as string | undefined) || page.slug,
      seoMeta,
      blocks,
    };
  }

  private async resolveNextProject(templateId: string, currentPageId: string) {
    const siblings = await this.prisma.page.findMany({
      where: { templateId, publishedVersionId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, title: true },
    });

    if (siblings.length <= 1) return null;

    const currentIndex = siblings.findIndex((p) => p.id === currentPageId);
    if (currentIndex === -1) return null;

    const nextIndex = (currentIndex + 1) % siblings.length;
    const next = siblings[nextIndex];
    if (!next) return null;

    return { slug: next.slug, title: next.title || next.slug };
  }
}