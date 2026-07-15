import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Custom guard for the Google OAuth callback route.
 *
 * Problem: The default `AuthGuard('google')` overrides `handleRequest` to throw
 * `UnauthorizedException` when `user` is falsy (e.g. strategy called `done(null, false)`).
 * That means the controller method would never be called — the browser would receive a raw 401
 * JSON instead of the planned redirect to `/login?error=no_account`.
 *
 * Fix: Override `handleRequest` to return null instead of throwing, so the controller gets
 * control and can perform the redirect itself.
 *
 * This guard is used ONLY on `GET /auth/google/callback`.
 * The initial `GET /auth/google` route keeps the plain `AuthGuard('google')`.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(_err: any, user: any): any {
    // Never throw — let the controller decide what to do when user is null
    return user ?? null;
  }
}
