import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Global CSRF guard — validates Origin/Referer on all state-changing requests.
 * GET/HEAD/OPTIONS are exempt (browsers don't reliably send Origin on same-site GETs).
 *
 * Allowed origins are read from CORS_ORIGIN env var (comma-separated) plus localhost:3000/5173.
 * On successful GET this guard is a no-op.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowed: string[];

  constructor() {
    const envOrigins = (process.env['CORS_ORIGIN'] ?? '').split(',').map((o) => o.trim()).filter(Boolean);
    // Always allow dev localhost origins as fallback
    this.allowed = [
      ...envOrigins,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5175',
    ];
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ method: string; headers: Record<string, string | undefined> }>();

    if (!UNSAFE_METHODS.has(req.method?.toUpperCase())) {
      return true;
    }

    const origin: string | undefined = req.headers['origin'] ?? this.extractOriginFromReferer(req.headers['referer']);

    if (!origin) {
      throw new ForbiddenException('CSRF check failed: missing Origin header');
    }

    const isAllowed = this.allowed.some((allowed) => origin.startsWith(allowed));
    if (!isAllowed) {
      throw new ForbiddenException('CSRF check failed: origin not allowed');
    }

    return true;
  }

  private extractOriginFromReferer(referer: string | undefined): string | undefined {
    if (!referer) return undefined;
    try {
      const url = new URL(referer);
      return url.origin;
    } catch {
      return undefined;
    }
  }
}
