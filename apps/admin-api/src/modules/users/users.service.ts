import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';

export const createUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId:   z.string().uuid(),
});

export const updateUserSchema = z
  .object({
    email:    z.string().email().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    roleId:   z.string().uuid().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

// Luôn exclude password + refreshTokenHash khỏi response
const USER_SELECT = {
  id:       true,
  email:    true,
  roleId:   true,
  password: false,
  refreshTokenHash: false,
  role: {
    select: {
      id:   true,
      name: true,
      rolePermissions: {
        select: {
          permission: { select: { id: true, resource: true, action: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { email: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException({ code: ErrorCode.CONFLICT, message: 'Email already in use' });

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Role not found' });

    const hashed = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { email: dto.email, password: hashed, roleId: dto.roleId },
      select: USER_SELECT,
    });
  }

  async findRoles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException({ code: ErrorCode.CONFLICT, message: 'Email already in use' });
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Role not found' });
    }

    const updateData: { email?: string; roleId?: string; password?: string } = {};
    if (dto.email) updateData.email = dto.email;
    if (dto.roleId) updateData.roleId = dto.roleId;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });
  }

  async delete(id: string, requesterId?: string) {
    if (requesterId && requesterId === id) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'You cannot delete your own account',
      });
    }
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }
}
