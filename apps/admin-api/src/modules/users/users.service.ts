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
  id:          true,
  email:       true,
  roleId:      true,
  googleId:    true,
  displayName: true,
  avatarUrl:   true,
  password:         false,
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

  async findAll(requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: {
        role: true,
      },
    });

    if (!requester) {
      throw new NotFoundException();
    }

    // ADMIN thấy tất cả
    if (requester.role.name.toLocaleLowerCase() === 'admin') {
      return this.prisma.user.findMany({
        select: USER_SELECT,
        orderBy: { email: 'asc' },
      });
    }

    // EDITOR không thấy ADMIN
    return this.prisma.user.findMany({
      where: {
        role: {
          name: {
            not: 'admin',
          },
        },
      },
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

  /**
   * Find an existing user by Google profile — never creates a new user.
   *
   * Flow:
   *   1. Fast path: look up by googleId (already linked)
   *   2. Slow path: look up by normalized email (first-time Google login for an existing account)
   *      → if found, update the record with googleId / displayName / avatarUrl (link)
   *   3. If not found by either → return null (caller/strategy must reject the login)
   */
  async findUserByGoogleProfile(profile: {
    googleId:    string;
    email:       string;
    displayName: string | null;
    avatarUrl:   string | null;
  }) {
    // Normalize email: Google profile emails can differ in casing
    const normalizedEmail = profile.email.toLowerCase().trim();

    // 1. Fast path — already linked
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
      select: USER_SELECT,
    });
    if (byGoogleId) return byGoogleId;

    // 2. Slow path — first Google login, find by email and link
    const byEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!byEmail) return null;  // no matching account — reject

    // Link Google account to existing user
    return this.prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId:    profile.googleId,
        displayName: profile.displayName,
        avatarUrl:   profile.avatarUrl,
      },
      select: USER_SELECT,
    });
  }
}
