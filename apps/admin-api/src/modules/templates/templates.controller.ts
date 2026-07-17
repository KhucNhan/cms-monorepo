import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequirePermissions } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TemplatesService } from './templates.service';
import { ContentType } from '@prisma/client';
import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  contentType: z.nativeEnum(ContentType),
});

export const setPlaceholdersSchema = z.object({
  placeholders: z.array(
    z.object({
      type: z.string().min(1),
      orderIndex: z.number().int().min(0),
    }),
  ),
});

export const previewDeleteSchema = z.object({
  type: z.string().min(1),
});

export type CreateTemplateDto = z.infer<typeof createTemplateSchema>;
export type SetPlaceholdersDto = z.infer<typeof setPlaceholdersSchema>;
export type PreviewDeleteDto = z.infer<typeof previewDeleteSchema>;

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @RequirePermissions('template:read')
  @ApiOperation({ summary: 'List all templates' })
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('template:read')
  @ApiOperation({ summary: 'Get template by ID' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  @RequirePermissions('template:create')
  @ApiOperation({ summary: 'Create a new template' })
  create(@Body(new ZodValidationPipe(createTemplateSchema)) dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch(':id/placeholders')
  @RequirePermissions('template:update')
  @ApiOperation({ summary: 'Overwrite all placeholders of a template' })
  setPlaceholders(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setPlaceholdersSchema)) dto: SetPlaceholdersDto,
  ) {
    return this.templatesService.setPlaceholders(id, dto.placeholders);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('template:delete')
  @ApiOperation({ summary: 'Delete a template' })
  remove(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Post(':id/placeholders/preview-delete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('template:read')
  @ApiOperation({ summary: 'Preview affected pages before deleting a placeholder' })
  previewDelete(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(previewDeleteSchema)) dto: PreviewDeleteDto,
  ) {
    return this.templatesService.previewDeletePlaceholder(id, dto.type);
  }
}
