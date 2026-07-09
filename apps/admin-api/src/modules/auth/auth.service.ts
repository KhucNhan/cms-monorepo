import { Injectable, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { JwtPayload, Permission } from '@cms/shared-types';
import type { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  // ── Helpers (giữ nguyên) ─────────────────────────────────

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

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    this.logger.log(`Login: ${user.email} (${user.role.name})`);
    return { accessToken, refreshToken };
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

  // ── Public methods (login, refreshTokens, logout giữ nguyên) ──
  // ... (không đổi, giữ y nguyên như bạn đã có)

  async loginWithGoogle(user: {
    id: string;
    email: string;
    roleId: string;
    role: { rolePermissions: Array<{ permission: { resource: string; action: string } }> };
  }) {
    const permissions = this.buildPermissions(user.role.rolePermissions);

    const payload: JwtPayload = {
      sub:         user.id,
      email:       user.email,
      roleId:      user.roleId,
      permissions,
    };

    const accessToken  = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(user.id);

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { refreshTokenHash: refreshHash },
    });

    this.logger.log(`Google Login: ${user.email}`);
    return { accessToken, refreshToken };
  }

  /**
   * Exchange Google authorization code for tokens, find matching user, issue JWT.
   * Replaces Passport's GoogleStrategy (Fastify-incompatible via Guard).
   * Returns null if no matching existing account (per current "existing users only" requirement).
   */
  async exchangeGoogleCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const clientId = process.env['GOOGLE_CLIENT_ID'];
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
    const callbackUrl = process.env['GOOGLE_CALLBACK_URL'];

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new Error(
        'Google OAuth env vars missing (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL)',
      );
    }

    try {
      // Step 1: Exchange code for Google access token
      const tokenResponse = await axios.post<{ access_token: string }>(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: 'authorization_code',
        },
      );

      const googleAccessToken = tokenResponse.data.access_token;

      // Step 2: Fetch Google user info
      const userInfoResponse = await axios.get<{
        id: string;
        email: string;
        name?: string;
        picture?: string;
        verified_email: boolean;
      }>('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });

      const { id: googleId, email, name, picture, verified_email } = userInfoResponse.data;

      if (!email || !googleId) {
        this.logger.warn('Google response missing email or id');
        return null;
      }

      if (!verified_email) {
        this.logger.warn(`Google email not verified: ${email}`);
        return null;
      }

      // Step 3: Find existing user (never auto-create)
      const user = await this.usersService.findUserByGoogleProfile({
        googleId,
        email,
        displayName: name ?? null,
        avatarUrl: picture ?? null,
      });

      if (!user) {
        this.logger.warn(`Google login rejected — no matching account for email: ${email}`);
        return null;
      }

      // Step 4: Issue tokens (reuse existing loginWithGoogle)
      return this.loginWithGoogle(user as any);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logger.error(
          `Google OAuth API error: ${err.response?.status} ${err.response?.statusText}`,
          JSON.stringify(err.response?.data),
        );
      } else if (err instanceof Error) {
        this.logger.error(`Google code exchange failed: ${err.message}`);
      } else {
        this.logger.error(`Google code exchange failed: ${String(err)}`);
      }
      throw err;
    }
  }

  // refreshTokens, logout: giữ nguyên như code gốc
  async refreshTokens(userId: string, rawRefreshToken: string) {
    const user = await this.getUserWithPermissions(userId);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Session not found, please login again');
    }

    const tokenMatches = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
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