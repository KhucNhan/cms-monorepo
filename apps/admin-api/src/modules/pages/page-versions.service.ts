import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '@cms/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { PagesService } from './pages.service';

@Injectable()
export class PageVersionsService {
  private readonly logger = new Logger(PageVersionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagesService: PagesService,
  ) {}

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

  /** Delete an orphan DRAFT version (e.g., created by a failed save). */
  async deleteDraft(versionId: string) {
    const version = await this.prisma.pageVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException('Version not found');
    if (version.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT versions can be deleted');
    }
    await this.prisma.block.deleteMany({ where: { pageVersionId: versionId } });
    await this.prisma.pageVersion.delete({ where: { id: versionId } });
    return { deleted: true };
  }
}
