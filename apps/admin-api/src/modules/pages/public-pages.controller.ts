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
        title: true,
        publishedVersion: { select: { seoMeta: true } },
      },
    });

    return pages.map((page: (typeof pages)[number]) => {
      const seoMeta = (page.publishedVersion?.seoMeta ?? {}) as Record<string, unknown>;
      return {
        id: page.id,
        slug: page.slug,
        // Ưu tiên Page.title (tên hiển thị thật) — seoMeta.title chỉ để làm fallback cho
        // các page tạo trước khi có cột title, cuối cùng mới fallback về slug.
        title: page.title || (seoMeta['title'] as string | undefined) || page.slug,
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
      page.publishedVersion.blocks.map(async (b: (typeof page.publishedVersion.blocks)[number]) => ({
        id: b.id,
        type: b.type,
        order: b.orderIndex,
        data: await this.blocksService.enrichBlockData(b.type, b.data),
      })),
    );

    return {
      id: page.id,
      slug: page.slug,
      // Ưu tiên Page.title thật, seoMeta.title chỉ dùng cho thẻ <title>/SEO description riêng
      // (đã trả nguyên seoMeta bên dưới cho FE tự dùng khi cần render <head>).
      title: page.title || (seoMeta['title'] as string | undefined) || page.slug,
      seoMeta,
      blocks,
    };
  }
}