import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(@Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService) {
    super({
      clientID:     process.env['GOOGLE_CLIENT_ID']     ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
      callbackURL:  process.env['GOOGLE_CALLBACK_URL']  ?? 'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
      state: false,   // explicit — avoid session dependency (Fastify has no session middleware yet); TODO: re-enable with @fastify/secure-session for CSRF protection
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: import('passport-google-oauth20').Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const emailEntry = profile.emails?.[0];

      // Defensive: reject unverified primary emails
      if (!emailEntry || emailEntry.verified !== true) {
        this.logger.warn(`Google login rejected — unverified email for profile ${profile.id}`);
        return done(null, false);
      }

      const user = await this.usersService.findUserByGoogleProfile({
        googleId:    profile.id,
        email:       emailEntry.value,
        displayName: profile.displayName ?? null,
        avatarUrl:   profile.photos?.[0]?.value ?? null,
      });

      if (!user) {
        this.logger.warn(`Google login rejected — no matching account for email ${emailEntry.value}`);
        return done(null, false);
      }

      this.logger.log(`Google login: linked to ${user.email}`);
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  }
}
