import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ErrorCode } from '@cms/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { PagesService } from './pages.service';
import { BlocksService } from '../blocks/blocks.service';
import type { Block, PageVersion } from '@prisma/client';

export const updateSeoMetaSchema = z.object({
  title: z.string().max(60).optional(),
  description: z.string().max(160).optional(),
});

export type UpdateSeoMetaDto = z.infer<typeof updateSeoMetaSchema>;

@Injectable()
export class PageVersionsService {
  private readonly logger = new Logger(PageVersionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagesService: PagesService,
    private readonly blocksService: BlocksService, // ← THÊM: cần để enrich image.url
  ) {}

  /**
   * Enrich `data.image.url` (hero) cho toàn bộ blocks của 1 version.
   * BlocksService.findByVersion() (GET /blocks) đã làm việc này, nhưng
   * getOrCreateDraft/cloneVersionIntoNewDraft/revertToVersion trả blocks
   * trực tiếp từ Prisma nên trước đây KHÔNG được enrich → image.url bị thiếu
   * khi mới vào Edit Mode ở apps/web (Bug 2).
   */
  private async enrichVersionBlocks<T extends { blocks: Block[] }>(version: T): Promise<T> {
    const enrichedBlocks = await Promise.all(
      version.blocks.map(async (b) => ({
        ...b,
        data: (await this.blocksService.enrichBlockData(b.type, b.data)) as object,
      })),
    );
    return { ...version, blocks: enrichedBlocks };
  }

  async findDraft(pageId: string) {
    return this.prisma.pageVersion.findFirst({
      where: { pageId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async fork(fromVersionId: string, createdBy: string) {
    const source = await this.prisma.pageVersion.findUnique({
      where: { id: fromVersionId },
    });
    if (!source) {
      throw new NotFoundException('Source version not found');
    }
    return this.pagesService.createDraftVersion(source.pageId, fromVersionId, createdBy);
  }

  /** Publish a version: set publishedVersionId and notify Next.js to revalidate cache. */
  async publish(pageId: string, versionId: string) {
    const version = await this.prisma.pageVersion.findFirst({
      where: { id: versionId, pageId },
    });
    if (!version) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Version not found' });
    }

    const [, updatedVersion, updatedPage] = await this.prisma.$transaction([
      this.prisma.pageVersion.updateMany({
        where: { pageId, status: 'PUBLISHED', id: { not: versionId } },
        data: { status: 'ARCHIVED' },
      }),
      this.prisma.pageVersion.update({
        where: { id: versionId },
        data: { status: 'PUBLISHED' },
      }),
      this.prisma.page.update({
        where: { id: pageId },
        data: { publishedVersionId: versionId },
      }),
    ]);

    await this.triggerRevalidate(updatedPage.slug);

    return { page: updatedPage, version: updatedVersion };
  }

  private async triggerRevalidate(slug: string): Promise<void> {
    const webUrl = process.env.WEB_URL;
    const secret = process.env.REVALIDATE_SECRET;

    if (!webUrl || !secret) {
      this.logger.warn('WEB_URL or REVALIDATE_SECRET not set — skipping cache revalidation');
      return;
    }

    try {
      const res = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ tags: [`page:${slug}`, 'published-pages'] }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => res.statusText);
        this.logger.error(`Revalidate webhook failed (${res.status}): ${body}`);
      }
    } catch (err) {
      this.logger.error('Revalidate webhook request failed', err);
    }
  }

  /**
   * List ARCHIVED versions.
   * - pageId provided → versions of that page only (used by history panel)
   * - pageId omitted  → all archived versions across all pages, includes page.slug
   */
  async findArchived(pageId?: string) {
    return this.prisma.pageVersion.findMany({
      where: { status: 'ARCHIVED', ...(pageId ? { pageId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { blocks: true } },
        page: { select: { id: true, slug: true } },
      },
    });
  }

  /**
   * Helper: clone any version (PUBLISHED or ARCHIVED) into a new DRAFT.
   * Deletes the existing DRAFT first (cascade removes its blocks).
   * Used by both getOrCreateDraft() and revertToVersion().
   */
  private async cloneVersionIntoNewDraft(
    pageId: string,
    sourceVersion: PageVersion & { blocks: Block[] },
    userId: string,
  ) {
    // Delete any existing DRAFT (cascade removes blocks)
    await this.prisma.pageVersion.deleteMany({ where: { pageId, status: 'DRAFT' } });

    return this.prisma.pageVersion.create({
      data: {
        pageId,
        status: 'DRAFT',
        seoMeta: sourceVersion.seoMeta as object,
        createdBy: userId,
        blocks: {
          createMany: {
            data: sourceVersion.blocks.map((b) => ({
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

  /**
   * Get existing DRAFT for a page or create one from the published version.
   * Throws ConflictException if the page has no published version to draft from.
   * Used by POST /pages/:id/draft (Live Edit Mode entry point).
   *
   * ⚠️ FIX (Bug 1 — 2 draft bị tạo ra):
   * - Thêm `orderBy: createdAt desc` khi tìm existing DRAFT — trước đây thiếu, nên nếu
   *   (do race) có >1 DRAFT tồn tại, có thể trả nhầm bản DRAFT cũ/stale (đây cũng là
   *   nguyên nhân gây hiện tượng "mất ảnh" ở Bug 2 khi lỡ load nhầm bản cũ).
   * - Bọc việc tạo DRAFT bằng try/catch bắt lỗi unique constraint (P2002) từ DB —
   *   xem migration thêm partial unique index bên dưới. Nếu thua race (request khác
   *   đã tạo DRAFT trước), refetch lại bản DRAFT vừa được tạo thay vì lỗi 500.
   *
   * ⚠️ FIX (Bug 2 — mất ảnh khi vào edit mode): trả về qua enrichVersionBlocks() để
   * `image.url` (hero) được resolve từ mediaId, giống hệt cách BlocksService.findByVersion() làm.
   */
  async getOrCreateDraft(pageId: string, userId: string) {
    // Return existing DRAFT if present
    const existing = await this.prisma.pageVersion.findFirst({
      where: { pageId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }, // ← FIX: đảm bảo lấy bản mới nhất nếu có nhiều DRAFT
      include: { blocks: { orderBy: { orderIndex: 'asc' } } },
    });
    if (existing) return this.enrichVersionBlocks(existing);

    // No DRAFT — clone from published version
    const page = await this.prisma.page.findUniqueOrThrow({ where: { id: pageId } });
    if (!page.publishedVersionId) {
      throw new ConflictException('Page has no published version to draft from');
    }

    const published = await this.prisma.pageVersion.findUniqueOrThrow({
      where: { id: page.publishedVersionId },
      include: { blocks: { orderBy: { orderIndex: 'asc' } } },
    });

    try {
      const created = await this.cloneVersionIntoNewDraft(pageId, published, userId);
      return this.enrichVersionBlocks(created);
    } catch (err) {
      // ← FIX: thua race condition — request khác đã tạo DRAFT trước (chặn bởi unique
      // index partial ở migration). Lấy lại bản DRAFT "chiến thắng" đó thay vì throw 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await this.prisma.pageVersion.findFirstOrThrow({
          where: { pageId, status: 'DRAFT' },
          orderBy: { createdAt: 'desc' },
          include: { blocks: { orderBy: { orderIndex: 'asc' } } },
        });
        return this.enrichVersionBlocks(winner);
      }
      throw err;
    }
  }

  /**
   * Revert page về một PUBLISHED version cũ.
   * 1. Validate versionId phải tồn tại và có status PUBLISHED
   * 2. Xóa DRAFT hiện tại (nếu có) — blocks bị xóa cascade theo schema
   * 3. Clone version đó thành DRAFT mới qua createDraftVersion
   */
  async revertToVersion(versionId: string, userId: string) {
    const targetVersion = await this.prisma.pageVersion.findFirst({
      where: { id: versionId, status: 'ARCHIVED' },
      include: { blocks: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!targetVersion) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Version not found or is not an ARCHIVED version.',
      });
    }

    const created = await this.cloneVersionIntoNewDraft(targetVersion.pageId, targetVersion, userId);
    return this.enrichVersionBlocks(created); // ← FIX: enrich luôn ở đây cho nhất quán
  }

  /**
   * Update SEO metadata (title/description) of a DRAFT or ARCHIVED version.
   * Merges into the existing seoMeta JSON so other keys (ogImage, noIndex) are preserved.
   * PUBLISHED versions are protected — the frontend must ensureDraftVersion() first.
   */
  async updateSeoMeta(versionId: string, dto: UpdateSeoMetaDto) {
    const version = await this.prisma.pageVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Version not found' });
    }
    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot edit metadata of a published version directly. Save to a draft first.');
    }

    const mergedSeoMeta = {
      ...(version.seoMeta as object),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    };

    return this.prisma.pageVersion.update({
      where: { id: versionId },
      data: { seoMeta: mergedSeoMeta },
    });
  }

  /** Delete a DRAFT or ARCHIVED version. PUBLISHED versions are protected. */
  async deleteVersion(versionId: string) {
    const version = await this.prisma.pageVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Version not found' });
    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Published versions cannot be deleted directly.');
    }
    await this.prisma.block.deleteMany({ where: { pageVersionId: versionId } });
    await this.prisma.pageVersion.delete({ where: { id: versionId } });
    return { deleted: true };
  }
}