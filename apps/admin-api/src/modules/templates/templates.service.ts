import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';
import { isValidBlockType } from '@cms/block-registry/schema-only';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.template.findMany({
      include: { placeholders: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { placeholders: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!template) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Template not found' });
    }
    return template;
  }

  /**
   * slugPrefix is auto-generated and IMMUTABLE — never accepted from the
   * client (schema §"Template" comment: renaming `name` later must not
   * break existing public URLs under /{slugPrefix}/{slug}).
   */
  private buildSlugPrefix(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base}s`;
  }

  async create(data: { name: string }) {
    const slugPrefix = this.buildSlugPrefix(data.name);

    const existing = await this.prisma.template.findUnique({ where: { slugPrefix } });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `A template generating slugPrefix "${slugPrefix}" already exists — choose a different name.`,
      });
    }

    // content-outlet placeholder mặc định vẫn giữ nguyên như cũ
    return this.prisma.template.create({
      data: {
        name: data.name,
        slugPrefix,
        placeholders: {
          create: { type: 'content-outlet', orderIndex: 0 },
        },
      },
      include: { placeholders: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async setPlaceholders(
    id: string,
    placeholders: Array<{ type: string; orderIndex: number }>,
  ) {
    await this.findOne(id);

    const outlets = placeholders.filter((p) => p.type === 'content-outlet');
    if (outlets.length !== 1) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Template must have exactly one "content-outlet" placeholder.',
      });
    }

    const nonOutletTypes = placeholders.filter((p) => p.type !== 'content-outlet').map((p) => p.type);
    if (new Set(nonOutletTypes).size !== nonOutletTypes.length) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Duplicate placeholder types are not allowed.',
      });
    }

    for (const p of placeholders) {
      if (!isValidBlockType(p.type)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Unknown block type: "${p.type}"`,
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.templatePlaceholder.deleteMany({ where: { templateId: id } }),
      this.prisma.templatePlaceholder.createMany({
        data: placeholders.map((p) => ({
          templateId: id,
          type: p.type,
          orderIndex: p.orderIndex,
          // Fixed, non-configurable rule (client input removed — see
          // setPlaceholdersSchema comment): ONLY 'hero' autofills 'title'
          // from Page.title. No other placeholder type gets an autoFillMap.
          autoFillMap: p.type === 'hero' ? { title: 'page.title' } : undefined,
        })),
      }),
    ]);

    return this.findOne(id);
  }

  async delete(id: string) {
    await this.findOne(id);
    const pagesUsing = await this.prisma.page.count({ where: { templateId: id } });
    if (pagesUsing > 0) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Cannot delete template in use by ${pagesUsing} page(s).`,
      });
    }
    return this.prisma.template.delete({ where: { id } });
  }

  async previewDeletePlaceholder(id: string, type: string) {
    await this.findOne(id);
    const affectedPages = await this.prisma.page.findMany({
      where: { templateId: id, versions: { some: { blocks: { some: { type } } } } },
      select: { id: true, title: true, slug: true },
    });
    return {
      affectedPageCount: affectedPages.length,
      affectedPages: affectedPages.map((p) => ({ id: p.id, title: p.title || p.slug })),
    };
  }
}