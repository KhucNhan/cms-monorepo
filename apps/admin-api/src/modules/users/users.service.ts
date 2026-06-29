import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@cms/shared-types';

export const createUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId:   z.string().uuid(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

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
}
