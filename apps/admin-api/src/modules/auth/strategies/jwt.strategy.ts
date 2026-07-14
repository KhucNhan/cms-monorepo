import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@cms/shared-types';

/**
 * Extract JWT from (in priority order):
 * 1. Authorization: Bearer <token> header  — standard API / admin-web access
 * 2. access_token httpOnly cookie          — shared-domain access from apps/web
 *
 * Both paths end up attaching the same JwtPayload to request.user.
 */
function cookieOrHeaderExtractor(req: any): string | null {
  // Prefer explicit Authorization header when present
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  // Fall back to httpOnly cookie (sent automatically by browser on same-domain requests)
  const cookies = req.cookies;
  return cookies?.['access_token'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: cookieOrHeaderExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_ACCESS_SECRET'] ?? '',
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    // Attach payload to request.user — downstream guards read from here
    return payload;
  }
}
