import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequirePermissions } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  BlocksService,
  reorderBlocksSchema,
  type ReorderBlocksDto,
} from './blocks.service';
import { z } from 'zod';

const createBlockBodySchema = z.object({
  pageVersionId: z.string().uuid(),
  type: z.string().min(1),
  orderIndex: z.number().int().min(0),
});
type CreateBlockBodyDto = z.infer<typeof createBlockBodySchema>;

@ApiTags('blocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get()
  @RequirePermissions('page:read')
  @ApiOperation({ summary: 'Get all blocks in a page version (ordered)' })
  findAll(@Query('pageVersionId') pageVersionId: string) {
    return this.blocksService.findByVersion(pageVersionId);
  }

  @Post()
  @RequirePermissions('page:update')
  @ApiOperation({ summary: 'Add a block to a page version' })
  create(@Body(new ZodValidationPipe(createBlockBodySchema)) dto: CreateBlockBodyDto) {
    return this.blocksService.create(dto.pageVersionId, {
      type: dto.type,
      orderIndex: dto.orderIndex,
    });
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('page:update')
  @ApiOperation({ summary: 'Bulk reorder blocks' })
  reorder(@Body(new ZodValidationPipe(reorderBlocksSchema)) dto: ReorderBlocksDto) {
    return this.blocksService.reorder(dto);
  }

  @Patch(':blockId')
  @RequirePermissions('page:update')
  @ApiOperation({ summary: 'Update block data' })
  update(
    @Param('blockId') blockId: string,
    @Body() dto: { data?: Record<string, any>; orderIndex?: number },
  ) {
    return this.blocksService.update(blockId, dto);
  }

  @Delete(':blockId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('page:update')
  @ApiOperation({ summary: 'Delete a block' })
  remove(@Param('blockId') blockId: string) {
    return this.blocksService.delete(blockId);
  }
}