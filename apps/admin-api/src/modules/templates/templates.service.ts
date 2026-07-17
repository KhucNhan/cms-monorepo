import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ContentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';
import { isValidBlockType } from '@cms/block-registry/schema-only';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.template.findMany({
      include: {
        placeholders: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: {
        placeholders: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Template not found',
      });
    }

    return template;
  }

  async create(data: { name: string; contentType: ContentType }) {
    const existing = await this.prisma.template.findUnique({
      where: { contentType: data.contentType },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Template for content type "${data.contentType}" already exists.`,
      });
    }

    // Khi tạo template mới, mặc định tự động tạo 1 placeholder đặc biệt: 'content-outlet'
    return this.prisma.template.create({
      data: {
        name: data.name,
        contentType: data.contentType,
        placeholders: {
          create: {
            type: 'content-outlet',
            orderIndex: 0,
          },
        },
      },
      include: {
        placeholders: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async setPlaceholders(id: string, placeholders: Array<{ type: string; orderIndex: number }>) {
    await this.findOne(id); // Ensure template exists

    // Validate:
    // 1. Phải có đúng 1 'content-outlet'
    const outlets = placeholders.filter((p) => p.type === 'content-outlet');
    if (outlets.length !== 1) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Template must have exactly one "content-outlet" placeholder.',
      });
    }

    // 2. Không cho 2 placeholder cùng type ngoài 'content-outlet'
    const nonOutletTypes = placeholders
      .filter((p) => p.type !== 'content-outlet')
      .map((p) => p.type);
    const uniqueTypes = new Set(nonOutletTypes);
    if (uniqueTypes.size !== nonOutletTypes.length) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Duplicate placeholder types are not allowed.',
      });
    }

    // 3. Mỗi placeholder type phải là block type hợp lệ trong block-registry
    for (const p of placeholders) {
      if (!isValidBlockType(p.type)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Unknown block type: "${p.type}"`,
        });
      }
    }

    // Thực hiện overwrite trong transaction
    await this.prisma.$transaction([
      this.prisma.templatePlaceholder.deleteMany({
        where: { templateId: id },
      }),
      this.prisma.templatePlaceholder.createMany({
        data: placeholders.map((p) => ({
          templateId: id,
          type: p.type,
          orderIndex: p.orderIndex,
        })),
      }),
    ]);

    return this.findOne(id);
  }

  async delete(id: string) {
    const template = await this.findOne(id);

    // Chặn nếu còn Page đang dùng
    const pagesUsing = await this.prisma.page.count({
      where: { templateId: id },
    });

    if (pagesUsing > 0) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Cannot delete template in use by ${pagesUsing} page(s).`,
      });
    }

    return this.prisma.template.delete({
      where: { id },
    });
  }

  async previewDeletePlaceholder(id: string, type: string) {
    await this.findOne(id); // Ensure template exists

    // Đếm số page đang dùng template này có block với type trùng placeholder sắp xoá
    // (Những block này sẽ trở thành block mồ côi)
    const affectedPages = await this.prisma.page.findMany({
      where: {
        templateId: id,
        versions: {
          some: {
            blocks: {
              some: { type },
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });

    return {
      affectedPageCount: affectedPages.length,
      affectedPages: affectedPages.map((p) => ({
        id: p.id,
        title: p.title || p.slug,
      })),
    };
  }
}
