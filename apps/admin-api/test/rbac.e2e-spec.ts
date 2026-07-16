import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

let app: any;
let adminToken: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
  adminToken = res.body.data.accessToken;
});

afterAll(async () => await app.close());

// Danh sách route theo đúng bảng "Latest audit" trong admin-api/AGENTS.md
// — test này tồn tại để phòng ai đó thêm route mới nhưng quên @RequirePermissions.
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

  // public-pages.controller.ts + 2 route Google OAuth là ngoại lệ DUY NHẤT được phép public
  it('GET /api/v1/public-pages/:slug không cần token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/public-pages/khong-ton-tai');
    expect([200, 404]).toContain(res.status); // không phải 401
  });

  it('GET /api/v1/auth/google không cần token (redirect tới Google)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/google');
    expect(res.status).toBe(302);
  });
});