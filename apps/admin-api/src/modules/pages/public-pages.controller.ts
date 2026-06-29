import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';

/**
 * Public (no-auth) endpoint used by the `apps/web` frontend.
 * Only serves PUBLISHED page versions.
 */
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
        publishedVersion: { select: { seoMeta: true } },
      },
    });

    return pages.map((page) => {
      const seoMeta = (page.publishedVersion?.seoMeta ?? {}) as Record<string, unknown>;
      return {
        id: page.id,
        slug: page.slug,
        title: (seoMeta['title'] as string | undefined) ?? page.slug,
      };
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published page by slug (public)' })
  async getBySlug(@Param('slug') slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug },
      include: {
        publishedVersion: {
          include: {
            blocks: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    if (!page || !page.publishedVersion) {
      throw new NotFoundException(`Page not found or not published: ${slug}`);
    }

    const seoMeta = (page.publishedVersion.seoMeta ?? {}) as Record<string, unknown>;

    const blocks = await Promise.all(
      page.publishedVersion.blocks.map(async (b) => ({
        id: b.id,
        type: b.type,
        order: b.orderIndex,
        data: await this.blocksService.enrichBlockData(b.type, b.data),
      })),
    );

    return {
      id: page.id,
      slug: page.slug,
      title: (seoMeta['title'] as string | undefined) ?? page.slug,
      seoMeta,
      blocks,
    };
  }
}
