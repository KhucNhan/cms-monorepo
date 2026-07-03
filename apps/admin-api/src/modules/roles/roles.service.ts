import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';

const roleWithPermissionsInclude = {
  rolePermissions: { include: { permission: true } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;

type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: typeof roleWithPermissionsInclude;
}>;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles: RoleWithPermissions[] = await this.prisma.role.findMany({
      include: roleWithPermissionsInclude,
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      userCount: r._count.users,
      permissions: r.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    }));
  }

  listAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async create(name: string) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Role name is required.',
      });
    }

    const existed = await this.prisma.role.findUnique({ where: { name: trimmed } });
    if (existed) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Role "${trimmed}" already exists.`,
      });
    }

    return this.prisma.role.create({ data: { name: trimmed } });
  }

  async rename(id: string, name: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Role not found.' });
    }
    return this.prisma.role.update({ where: { id }, data: { name: name.trim().toLowerCase() } });
  }

  // "Grant permission" — admin cấp quyền cho role, ghi đè toàn bộ set permission
  async setPermissions(id: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Role not found.' });
    }

    const allPermissions = await this.prisma.permission.findMany({ select: { id: true } });
    const validIds = new Set(allPermissions.map((p) => p.id));
    const invalid = permissionIds.filter((pid) => !validIds.has(pid));
    if (invalid.length) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Invalid permission ids: ${invalid.join(', ')}`,
      });
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      }),
    ]);

    return this.findOne(id);
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: roleWithPermissionsInclude,
    });
    if (!role) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Role not found.' });
    }
    return {
      id: role.id,
      name: role.name,
      userCount: role._count.users,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    };
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Role not found.' });
    }
    const userCount = await this.prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Cannot delete role in use by ${userCount} user(s).`,
      });
    }
    return this.prisma.role.delete({ where: { id } });
  }
}