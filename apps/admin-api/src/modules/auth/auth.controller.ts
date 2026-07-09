import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/cookie';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { loginSchema, type LoginDto } from './dto/auth.dto';
import type { JwtPayload } from '@cms/shared-types';

const REFRESH_COOKIE = 'cms_refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService, // inject — không new trực tiếp
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperation({ summary: 'Login and receive access token + refresh cookie' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'admin@cms.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Use refresh cookie to get new access token' })
  async refresh(@Req() req: FastifyRequest) {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: process.env['JWT_REFRESH_SECRET'],
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { accessToken } = await this.authService.refreshTokens(
      payload.sub,
      refreshToken,
    );
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(
    @Req() req: FastifyRequest & { user: JwtPayload },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.logout(req.user.sub);
    reply.clearCookie(REFRESH_COOKIE, { path: cookieOptions.path });
    return { message: 'Logged out successfully' };
  }

  @Post('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user info' })
  me(@Req() req: FastifyRequest & { user: JwtPayload }) {
    return req.user;
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  /**
   * Step 1 — Redirect to Google consent screen.
   * Manually redirects to bypass Passport's Express-style response method calls
   * which are incompatible with Fastify.
   */
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth flow (redirects to Google)' })
  async googleLogin(@Res() reply: FastifyReply) {
    const clientId = process.env['GOOGLE_CLIENT_ID'];
    const redirectUri = process.env['GOOGLE_CALLBACK_URL'];
    
    if (!clientId || !redirectUri) {
      throw new Error('Google OAuth configuration is missing (GOOGLE_CLIENT_ID or GOOGLE_CALLBACK_URL)');
    }

    const scope = 'email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}`;

    return reply.code(302).redirect(authUrl);
  }

  /**
   * Step 2 — Google redirects back here after user consents.
   * Uses GoogleAuthGuard (not plain AuthGuard) so a rejected login (no matching account)
   * results in a redirect to /login?error=no_account rather than a raw 401 JSON.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — handles token exchange and redirect' })
  async googleCallback(
    @Req()  req:   FastifyRequest & { user?: any },
    @Res()  reply: FastifyReply,
  ) {
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';

    if (!req.user) {
      // Strategy returned done(null, false) — no matching account
      return reply.code(302).redirect(`${frontendUrl}/login?error=no_account`);
    }

    const { accessToken, refreshToken } = await this.authService.loginWithGoogle(req.user);
    reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    return reply.code(302).redirect(`${frontendUrl}/auth/callback#token=${accessToken}`);
  }
}