import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequirePermissions } from '../auth/guards/roles.guard';
import { PageVersionsService } from './page-versions.service';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@cms/shared-types';

@ApiTags('page-versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('page-versions')
export class PageVersionsController {
  constructor(private readonly pageVersionsService: PageVersionsService) {}

  @Get()
  @ApiOperation({ summary: 'Find draft version for a page' })
  findDraft(@Query('pageId') pageId: string) {
    return this.pageVersionsService.findDraft(pageId);
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
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('page:delete')
  @ApiOperation({ summary: 'Delete a DRAFT version (orphan cleanup)' })
  deleteDraft(@Param('id') id: string) {
    return this.pageVersionsService.deleteDraft(id);
  }
}
