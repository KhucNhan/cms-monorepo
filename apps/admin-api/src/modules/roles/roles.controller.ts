import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequirePermissions } from '../auth/guards/roles.guard';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role:read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions/list')
  @RequirePermissions('role:read')
  listAllPermissions() {
    return this.rolesService.listAllPermissions();
  }

  @Post()
  @RequirePermissions('role:create')
  create(@Body() body: { name: string }) {
    return this.rolesService.create(body.name);
  }

  @Patch(':id')
  @RequirePermissions('role:update')
  rename(@Param('id') id: string, @Body() body: { name: string }) {
    return this.rolesService.rename(id, body.name);
  }

  @Patch(':id/permissions')
  @RequirePermissions('role:update')
  setPermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.rolesService.setPermissions(id, body.permissionIds);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}