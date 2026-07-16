import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { CsrfGuard } from '../src/common/guards/csrf.guard';
import request from 'supertest';

const TEST_ORIGIN = 'http://localhost:5173'; // nằm sẵn trong whitelist mặc định của CsrfGuard

let app: NestFastifyApplication;
let adminToken: string;

beforeAll(async () => {
  app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { logger: false, abortOnError: false },  // ← thêm dòng này
    );

  await app.register(fastifyCookie, {
    secret: process.env['COOKIE_SECRET'] ?? 'cms-cookie-secret-change-me',
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(new CsrfGuard());

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  // CsrfGuard chặn mọi POST/PUT/PATCH/DELETE thiếu Origin — supertest không tự
  // gửi header này (không phải trình duyệt thật), nên phải set thủ công, dùng
  // đúng 1 giá trị nằm trong whitelist mặc định của CsrfGuard.
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('Origin', TEST_ORIGIN)
    .send({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
  adminToken = res.body.data.accessToken;
});

afterAll(async () => await app.close());

const protectedRoutes: Array<[string, string]> = [
  ['get', '/api/v1/pages'],
  ['get', '/api/v1/blocks'],
  ['get', '/api/v1/page-versions'],
  ['get', '/api/v1/page-versions/archived'],
  ['get', '/api/v1/media'],
  ['get', '/api/v1/users'],
  ['get', '/api/v1/roles'],
];

describe('RBAC — không route nào bỏ sót permission (Section 5, AGENTS.md)', () => {
  it.each(protectedRoutes)('%s %s không token → 401', async (method, path) => {
    await (request(app.getHttpServer()) as any)[method](path).expect(401);
  });

  it.each(protectedRoutes)('%s %s có token admin hợp lệ → không phải 401/403', async (method, path) => {
    const res = await (request(app.getHttpServer()) as any)[method](path).set(
      'Authorization',
      `Bearer ${adminToken}`,
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('GET /api/v1/public-pages/:slug không cần token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/public-pages/khong-ton-tai');
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/v1/auth/google không cần token (redirect tới Google)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/google');
    expect(res.status).toBe(302);
  });
});