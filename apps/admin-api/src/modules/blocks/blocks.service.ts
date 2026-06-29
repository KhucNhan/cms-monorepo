import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { getBlockDefinition, isValidBlockType } from '@cms/block-registry/schema-only';
import { ErrorCode } from '@cms/shared-types';

// ── Input schemas ─────────────────────────────────────────

export const createBlockSchema = z.object({
  type: z.string().min(1),
  orderIndex: z.number().int().min(0),
  data: z.record(z.unknown()),
});

export const updateBlockSchema = z.object({
  data: z.record(z.unknown()).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const reorderBlocksSchema = z.object({
  order: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0),
    }),
  ),
});

export type CreateBlockDto = z.infer<typeof createBlockSchema>;
export type UpdateBlockDto = z.infer<typeof updateBlockSchema>;
export type ReorderBlocksDto = z.infer<typeof reorderBlocksSchema>;

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Validate block.data bằng schema từ block-registry — NGUỒN SỰ THẬT DUY NHẤT */
  private validateBlockData(type: string, data: unknown) {
    if (!isValidBlockType(type)) {
      throw new BadRequestException({
        code: ErrorCode.UNKNOWN_BLOCK_TYPE,
        message: `Unknown block type: "${type}"`,
      });
    }

    const definition = getBlockDefinition(type);
    const result = definition.schema.safeParse(data);

    if (!result.success) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Invalid data for block type "${type}"`,
        details: result.error.flatten(),
      });
    }

    return result.data;
  }

  /** Resolve hero image.url from media table when only mediaId is stored */
  async enrichBlockData(type: string, data: unknown): Promise<unknown> {
    if (type !== 'hero' || !data || typeof data !== 'object') {
      return data;
    }

    const hero = data as Record<string, unknown>;
    const image = hero['image'] as Record<string, unknown> | undefined;
    const mediaId = image?.['mediaId'] as string | undefined;

    if (!mediaId || image?.['url']) {
      return data;
    }

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      return data;
    }

    return {
      ...hero,
      image: { ...image, url: media.url },
    };
  }

  async findByVersion(pageVersionId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { pageVersionId },
      orderBy: { orderIndex: 'asc' },
    });

    return Promise.all(
      blocks.map(async (block) => ({
        ...block,
        data: (await this.enrichBlockData(block.type, block.data)) as object,
      })),
    );
  }

  async findOne(id: string) {
    const block = await this.prisma.block.findUnique({ where: { id } });
    if (!block) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: `Block not found: ${id}` });
    }
    return block;
  }

  async create(pageVersionId: string, dto: Omit<CreateBlockDto, 'data'>) {
    // 1. Ensure page version exists
    const version = await this.prisma.pageVersion.findUnique({
      where: { id: pageVersionId },
    });
    if (!version) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Page version not found' });
    }

    // 2. Validate defaultData from registry
    const definition = getBlockDefinition(dto.type);
    const validatedData = this.validateBlockData(dto.type, definition.defaultData);

    // 3. Shift blocks at or after orderIndex down by 1 (insert in middle)
    if (dto.orderIndex !== undefined) {
      await this.prisma.block.updateMany({
        where: {
          pageVersionId,
          orderIndex: { gte: dto.orderIndex },
        },
        data: { orderIndex: { increment: 1 } },
      });
    }

    return this.prisma.block.create({
      data: {
        pageVersionId,
        type: dto.type,
        orderIndex: dto.orderIndex,
        data: validatedData as object,
      },
    });
  }

  async update(id: string, dto: UpdateBlockDto) {
    const block = await this.findOne(id);

    const updateData: Record<string, unknown> = {};

    if (dto.data !== undefined) {
      const validated = this.validateBlockData(block.type, dto.data);
      updateData['data'] = await this.enrichBlockData(block.type, validated);
    }

    if (dto.orderIndex !== undefined) {
      updateData['orderIndex'] = dto.orderIndex;
    }

    return this.prisma.block.update({
      where: { id },
      data: updateData,
    });
  }

  /** Bulk reorder — single transaction, optimistic concurrency friendly */
  async reorder(dto: ReorderBlocksDto) {
    const updates = dto.order.map((item) =>
      this.prisma.block.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }

  async delete(id: string) {
    const block = await this.findOne(id);
    const version = await this.prisma.pageVersion.findUnique({
      where: { id: block.pageVersionId },
    });
    if (version?.status !== 'DRAFT') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Cannot delete blocks from a published or archived version',
      });
    }
    await this.prisma.block.delete({ where: { id } });
    return { deleted: true };
  }
}
