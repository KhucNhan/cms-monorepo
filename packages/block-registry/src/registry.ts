import { heroBlock } from './blocks/hero';
import { richTextBlock } from './blocks/rich-text';
import { faqBlock } from './blocks/faq';
import { contentOutletBlock } from './blocks/content-outlet';
import type { BlockDefinition } from './types';

// ─────────────────────────────────────────────────────────
// Registry
// Thêm block mới: import ở đây + push vào mảng ALL_BLOCKS.
// Không cần sửa controller, Next.js route, hay switch-case nào khác.
// ─────────────────────────────────────────────────────────

const ALL_BLOCKS: BlockDefinition[] = [
  heroBlock,
  richTextBlock,
  faqBlock,
  // content-outlet: marker-only, not shown in BlockPickerModal (filtered by UI)
  contentOutletBlock,
  // Phase 3: bannerBlock, galleryBlock, productListBlock, ctaBlock
];

export const blockRegistry = new Map<string, BlockDefinition>(
  ALL_BLOCKS.map((def) => [def.type, def]),
);

/**
 * Lookup block definition theo type string.
 * Throw rõ ràng nếu type không tồn tại — giúp debug nhanh hơn khi
 * có block type cũ bị lưu trong DB mà chưa có definition mới.
 */
export function getBlockDefinition(type: string): BlockDefinition {
  const def = blockRegistry.get(type);
  if (!def) {
    throw new Error(
      `Unknown block type: "${type}". ` +
        `Available types: [${[...blockRegistry.keys()].join(', ')}]`,
    );
  }
  return def;
}

/** Danh sách tất cả block definitions (dùng cho block picker UI) */
export function getAllBlockDefinitions(): BlockDefinition[] {
  return [...blockRegistry.values()];
}

/** Check type có hợp lệ hay không (không throw) */
export function isValidBlockType(type: string): boolean {
  return blockRegistry.has(type);
}
