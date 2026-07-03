import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequirePermissions } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  PageVersionsService,
  updateSeoMetaSchema,
  type UpdateSeoMetaDto,
} from './page-versions.service';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@cms/shared-types';

@ApiTags('page-versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('page-versions')
export class PageVersionsController {
  constructor(private readonly pageVersionsService: PageVersionsService) {}

  @Get()
  @RequirePermissions('page:read')
  @ApiOperation({ summary: 'Find draft version for a page' })
  findDraft(@Query('pageId') pageId: string) {
    return this.pageVersionsService.findDraft(pageId);
  }

  @Get('archived')
  @RequirePermissions('page:read')
  @ApiOperation({ summary: 'List ARCHIVED versions. Pass ?pageId= to filter by page, omit for all pages.' })
  findArchived(@Query('pageId') pageId?: string) {
    return this.pageVersionsService.findArchived(pageId);
  }

  @Post(':id/fork')
  @RequirePermissions('page:create')
  @ApiOperation({ summary: 'Fork a published version into a new draft' })
  fork(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { user: JwtPayload },
  ) {
    return this.pageVersionsService.fork(id, req.user.sub);
  }
  @Patch(':id')
  @RequirePermissions('page:update')
  @ApiOperation({ summary: 'Update SEO metadata (title/description) of a DRAFT or ARCHIVED version' })
  updateSeoMeta(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSeoMetaSchema)) dto: UpdateSeoMetaDto,
  ) {
    return this.pageVersionsService.updateSeoMeta(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('page:delete')
  @ApiOperation({ summary: 'Delete a DRAFT or ARCHIVED version' })
  deleteVersion(@Param('id') id: string) {
    return this.pageVersionsService.deleteVersion(id);
  }

  @Post(':id/revert')
  @RequirePermissions('page:create')
  @ApiOperation({ summary: 'Revert page to a PUBLISHED version — deletes current DRAFT and clones target as new DRAFT' })
  revert(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { user: JwtPayload },
  ) {
    return this.pageVersionsService.revertToVersion(id, req.user.sub);
  }
}