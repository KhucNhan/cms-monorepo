import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PagesModule } from './modules/pages/pages.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { UsersModule } from './modules/users/users.module';
import { MediaModule } from './modules/media/media.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    // Structured JSON logging (nestjs-pino wraps pino under the hood)
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        // Auto-generate request-id for distributed tracing
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) ??
          crypto.randomUUID(),
      },
    }),

    PrismaModule,
    AuthModule,
    PagesModule,
    BlocksModule,
    UsersModule,
    MediaModule,
    RolesModule,
  ],
})
export class AppModule {}
