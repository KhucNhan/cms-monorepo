import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload, Permission } from '@cms/shared-types';
import type { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────

  /** Load user với role + permissions qua join, trả về Permission[] dạng "resource:action" */
  private async getUserWithPermissions(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
  }

  private buildPermissions(
    rolePermissions: Array<{ permission: { resource: string; action: string } }>,
  ): Permission[] {
    return rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}` as Permission,
    );
  }

  private signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: process.env['JWT_ACCESS_SECRET'],
      expiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    });
  }

  private signRefreshToken(sub: string): string {
    return this.jwt.sign(
      { sub },
      {
        secret: process.env['JWT_REFRESH_SECRET'],
        expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
      },
    );
  }

  // ── Public methods ───────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    // Constant-time rejection — chạy bcrypt dù user không tồn tại
    const hash = user?.password ?? '$2b$12$invalidhashpadding00000000000000';
    const passwordValid = await bcrypt.compare(dto.password, hash);

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = this.buildPermissions(user.role.rolePermissions);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions,
    };

    const accessToken  = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(user.id);

    // Lưu hash refresh token (không lưu raw)
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    this.logger.log(`Login: ${user.email} (${user.role.name})`);
    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string, rawRefreshToken: string) {
    const user = await this.getUserWithPermissions(userId);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Session not found, please login again');
    }

    const tokenMatches = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      // Nghi ngờ token reuse — revoke toàn bộ session
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Token reuse detected, session revoked');
    }

    const permissions = this.buildPermissions(user.role.rolePermissions);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions,
    };

    const newAccessToken  = this.signAccessToken(payload);
    const newRefreshToken = this.signRefreshToken(user.id);

    // Rotate — hash mới thay hash cũ
    const newHash = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newHash },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }
}
