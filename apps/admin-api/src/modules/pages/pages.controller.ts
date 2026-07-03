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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequirePermissions } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  PagesService,
  createPageSchema,
  updatePageSchema,
  listPagesSchema,
  type CreatePageDto,
  type UpdatePageDto,
} from './pages.service';
import { PageVersionsService } from './page-versions.service';
import type { JwtPayload } from '@cms/shared-types';

@ApiTags('pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pages')
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly pageVersionsService: PageVersionsService,
  ) {}

  @Get()
  @RequirePermissions('page:read')
  @ApiOperation({ summary: 'List all pages (paginated)' })
  findAll(@Query(new ZodValidationPipe(listPagesSchema)) query: { page: number; pageSize: number; search?: string }) {
    return this.pagesService.findAll(query);
  }

  @Get(':idOrSlug')
  @RequirePermissions('page:read')
  @ApiOperation({ summary: 'Get page by id or slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.pagesService.findByIdOrSlug(idOrSlug);
  }

  @Post()
  @RequirePermissions('page:create')
  @ApiOperation({ summary: 'Create a new page (starts as DRAFT)' })
  create(
    @Body(new ZodValidationPipe(createPageSchema)) dto: CreatePageDto,
    @Req() req: FastifyRequest & { user: JwtPayload },
  ) {
    return this.pagesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @RequirePermissions('page:update')
  @ApiOperation({ summary: 'Update page slug' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePageSchema)) dto: UpdatePageDto,
  ) {
    return this.pagesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('page:delete')
  @ApiOperation({ summary: 'Delete page and all its versions' })
  remove(@Param('id') id: string) {
    return this.pagesService.delete(id);
  }

  @Post(':pageId/versions/:versionId/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('page:publish')
  @ApiOperation({ summary: 'Publish a specific version of a page' })
  publish(
    @Param('pageId') pageId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.pageVersionsService.publish(pageId, versionId);
  }

  @Post(':pageId/versions/:versionId/draft')
  @RequirePermissions('page:update')
  @ApiOperation({ summary: 'Create new DRAFT version from an existing version' })
  createDraft(
    @Param('pageId') pageId: string,
    @Param('versionId') versionId: string,
    @Req() req: FastifyRequest & { user: JwtPayload },
  ) {
    return this.pagesService.createDraftVersion(pageId, versionId, req.user.sub);
  }
}