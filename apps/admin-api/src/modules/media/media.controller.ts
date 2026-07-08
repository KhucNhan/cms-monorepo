import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequirePermissions } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MediaService, listMediaSchema } from './media.service';
import { Body, Patch } from '@nestjs/common';
import { renameMediaSchema, updateMediaSchema } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions('media:read')
  @ApiOperation({ summary: 'List media files (paginated)' })
  findAll(@Query(new ZodValidationPipe(listMediaSchema)) query: { page: number; pageSize: number; mimeType?: string; search?: string }) {
    return this.mediaService.findAll(query);
  }

  @Patch(':id/rename')
  @RequirePermissions('media:create')
  @ApiOperation({ summary: 'Rename a media file' })
  async rename(@Param('id') id: string, @Body() body: unknown) {
    const dto = renameMediaSchema.parse(body);
    return this.mediaService.rename(id, dto.name);
  }

  @Patch(':id')
  @RequirePermissions('media:update')
  @ApiOperation({ summary: 'Update media metadata (name and/or altText). Route: PATCH /api/v1/media/:id' })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const dto = updateMediaSchema.parse(body);
    return this.mediaService.update(id, dto);
  }

  @Get(':id')
  @RequirePermissions('media:read')
  @ApiOperation({ summary: 'Get a single media item' })
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Post('upload')
  @RequirePermissions('media:create')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image or SVG file' })
  async upload(@Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file provided');
    }
    return this.mediaService.upload({
      filename: data.filename,
      mimetype: data.mimetype,
      file: data.file,
    });
  }

  @Get(':id/usages')
  @RequirePermissions('media:read')
  @ApiOperation({ summary: 'List blocks currently referencing this media' })
  getUsages(@Param('id') id: string) {
    return this.mediaService.getUsages(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('media:delete')
  @ApiOperation({ summary: 'Delete a media file (strips references from blocks if in use)' })
  remove(@Param('id') id: string) {
    return this.mediaService.delete(id, true); // FE luôn confirm trước, force luôn true
  }
}