/**
 * @cms/block-registry/schema-only
 *
 * Entry point dành riêng cho NestJS (admin-api).
 * Chỉ export schema + registry functions — không có Editor/Renderer React.
 * Đảm bảo NestJS không kéo React, DOM, browser API vào bundle Node.
 */
export * from './src/types';
export * from './src/registry';
export { heroSchema, type HeroData } from './src/blocks/hero/schema';
export { richTextSchema, type RichTextData } from './src/blocks/rich-text/schema';
export { faqSchema, type FaqData } from './src/blocks/faq/schema';
export { contentOutletSchema, type ContentOutletData } from './src/blocks/content-outlet/schema';
