import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PageVersionsService } from './page-versions.service';

describe('PageVersionsService.publish — invariant 1.5: chỉ flip pointer, không mutate published cũ', () => {
  let prismaMock: any;
  let service: PageVersionsService;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    prismaMock = {
      pageVersion: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      page: { update: vi.fn() },
      $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
    };
    service = new PageVersionsService(prismaMock, {} as any, {} as any);
    process.env.WEB_URL = 'https://web.example.com';
    process.env.REVALIDATE_SECRET = 'secret';
  });

  it('version không tồn tại → NotFoundException, không chạm DB update nào', async () => {
    prismaMock.pageVersion.findFirst.mockResolvedValue(null);
    await expect(service.publish('p1', 'missing-v')).rejects.toThrow(NotFoundException);
    expect(prismaMock.page.update).not.toHaveBeenCalled();
  });

  it('publish thành công: archive version PUBLISHED cũ, set version mới = PUBLISHED, page.publishedVersionId trỏ đúng — KHÔNG có update nào khác lên nội dung version', async () => {
    prismaMock.pageVersion.findFirst.mockResolvedValue({ id: 'v2', pageId: 'p1' });
    prismaMock.pageVersion.update.mockResolvedValue({ id: 'v2', status: 'PUBLISHED' });
    prismaMock.page.update.mockResolvedValue({ id: 'p1', slug: 'trang-a', publishedVersionId: 'v2' });

    const result = await service.publish('p1', 'v2');

    // (1) archive mọi PUBLISHED khác trong cùng page, trừ version mới
    expect(prismaMock.pageVersion.updateMany).toHaveBeenCalledWith({
      where: { pageId: 'p1', status: 'PUBLISHED', id: { not: 'v2' } },
      data: { status: 'ARCHIVED' },
    });
    // (2) version mới → PUBLISHED (chỉ đổi status, không đổi data/blocks)
    expect(prismaMock.pageVersion.update).toHaveBeenCalledWith({
      where: { id: 'v2' },
      data: { status: 'PUBLISHED' },
    });
    // (3) Page.publishedVersionId = pointer duy nhất bị thay đổi ở tầng Page
    expect(prismaMock.page.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { publishedVersionId: 'v2' },
    });
    expect(result.page.publishedVersionId).toBe('v2');
  });

  it('publish thành công → gọi webhook revalidate đúng slug', async () => {
    prismaMock.pageVersion.findFirst.mockResolvedValue({ id: 'v2', pageId: 'p1' });
    prismaMock.pageVersion.update.mockResolvedValue({ id: 'v2' });
    prismaMock.page.update.mockResolvedValue({ id: 'p1', slug: 'trang-a' });

    await service.publish('p1', 'v2');

    expect(fetch).toHaveBeenCalledWith(
      'https://web.example.com/api/revalidate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-revalidate-secret': 'secret' }),
        body: JSON.stringify({ tags: ['page:trang-a', 'published-pages'] }),
      }),
    );
  });

  it('thiếu WEB_URL/REVALIDATE_SECRET → skip revalidate, KHÔNG chặn publish (không throw)', async () => {
    delete process.env.WEB_URL;
    prismaMock.pageVersion.findFirst.mockResolvedValue({ id: 'v2', pageId: 'p1' });
    prismaMock.pageVersion.update.mockResolvedValue({ id: 'v2' });
    prismaMock.page.update.mockResolvedValue({ id: 'p1', slug: 'trang-a' });

    await expect(service.publish('p1', 'v2')).resolves.toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});