import { describe, it, expect } from 'vitest';
import { mergeTemplateWithPage } from './template-merge.util';
import { Block, TemplatePlaceholder } from '@prisma/client';

describe('mergeTemplateWithPage', () => {
  const createMockPlaceholder = (type: string, orderIndex: number): TemplatePlaceholder => ({
    id: `placeholder-${type}`,
    templateId: 'template-1',
    type,
    orderIndex,
    updatedAt: new Date(),
  });

  const createMockBlock = (id: string, type: string, orderIndex: number, data: any = {}): Block => ({
    id,
    pageVersionId: 'version-1',
    type,
    orderIndex,
    data,
    updatedAt: new Date(),
  });

  it('hoạt động đúng: các block placeholders được gán đúng vị trí, block outlet được gộp và sắp xếp đúng trong outlet', () => {
    const placeholders = [
      createMockPlaceholder('hero', 0),
      createMockPlaceholder('content-outlet', 1),
      createMockPlaceholder('faq', 2),
    ];

    const blocks = [
      createMockBlock('b-rich-1', 'rich-text', 1, { text: 'outlet 1' }),
      createMockBlock('b-faq', 'faq', 2, { question: 'faq Q' }),
      createMockBlock('b-hero', 'hero', 0, { title: 'hero title' }),
      createMockBlock('b-rich-2', 'rich-text', 3, { text: 'outlet 2' }),
    ];

    const merged = mergeTemplateWithPage(placeholders, blocks);

    // Thứ tự mong đợi:
    // 1. hero (b-hero)
    // 2. outlet blocks: b-rich-1 (orderIndex 1), b-rich-2 (orderIndex 3)
    // 3. faq (b-faq)
    expect(merged).toHaveLength(4);
    expect(merged[0]?.id).toBe('b-hero');
    expect(merged[1]?.id).toBe('b-rich-1');
    expect(merged[2]?.id).toBe('b-rich-2');
    expect(merged[3]?.id).toBe('b-faq');
  });

  it('xử lý block cùng type trong outlet: block hero đầu tiên gán cho placeholder, block hero thứ 2 đi vào outlet', () => {
    const placeholders = [
      createMockPlaceholder('hero', 0),
      createMockPlaceholder('content-outlet', 1),
    ];

    const blocks = [
      createMockBlock('b-hero-1', 'hero', 0, { title: 'hero 1' }),
      createMockBlock('b-rich', 'rich-text', 1, { text: 'some text' }),
      createMockBlock('b-hero-2', 'hero', 2, { title: 'hero 2 (outlet)' }),
    ];

    const merged = mergeTemplateWithPage(placeholders, blocks);

    // Thứ tự mong đợi:
    // 1. hero (b-hero-1)
    // 2. outlet blocks: b-rich, b-hero-2
    expect(merged).toHaveLength(3);
    expect(merged[0]?.id).toBe('b-hero-1');
    expect(merged[1]?.id).toBe('b-rich');
    expect(merged[2]?.id).toBe('b-hero-2');
  });

  it('chưa implement placeholder → bỏ qua, không render gì cho placeholder đó', () => {
    const placeholders = [
      createMockPlaceholder('hero', 0),
      createMockPlaceholder('content-outlet', 1),
      createMockPlaceholder('faq', 2),
    ];

    const blocks = [
      createMockBlock('b-rich', 'rich-text', 1),
      // thiếu block faq và hero
    ];

    const merged = mergeTemplateWithPage(placeholders, blocks);

    // Thứ tự mong đợi:
    // 1. outlet blocks: b-rich
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe('b-rich');
  });

  it('khi xoá placeholder khỏi Template (ví dụ faq bị xoá) → block faq mồ côi tự động bị ẩn khỏi render', () => {
    // Template chỉ còn hero và content-outlet
    const placeholders = [
      createMockPlaceholder('hero', 0),
      createMockPlaceholder('content-outlet', 1),
    ];

    const blocks = [
      createMockBlock('b-hero', 'hero', 0),
      createMockBlock('b-faq', 'faq', 2), // block faq mồ côi (nên bị ẩn)
      createMockBlock('b-rich', 'rich-text', 1), // block trong outlet (nên được render)
    ];

    const merged = mergeTemplateWithPage(placeholders, blocks);

    // Thứ tự mong đợi:
    // 1. hero (b-hero)
    // 2. outlet blocks: b-rich (b-faq bị ẩn)
    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe('b-hero');
    expect(merged[1]?.id).toBe('b-rich');
  });
});
