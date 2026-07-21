import { Block, TemplatePlaceholder } from '@prisma/client';

export function mergeTemplateWithPage(
  placeholders: TemplatePlaceholder[],
  allBlocks: Block[],
): Block[] {
  // 1. Phân loại các placeholder (ngoại trừ content-outlet)
  const nonOutletPlaceholderTypes = placeholders
    .filter((p) => p.type !== 'content-outlet')
    .map((p) => p.type);

  const placeholderTypesSet = new Set(nonOutletPlaceholderTypes);

  // Định nghĩa các block type thuộc nhóm placeholder (không được tự do render ở outlet nếu template không định nghĩa)
  const PLACEHOLDER_TYPES = new Set(['hero', 'faq']);

  // 2. Phân loại blocks của page thành:
  // - implemented: block implement cho từng placeholder (khớp type đầu tiên tìm thấy)
  // - outlet: các block còn lại (sẽ render trong content-outlet, trừ các block mồ côi của placeholder khác)
  const implementedMap = new Map<string, Block>();
  const outletBlocks: Block[] = [];

  for (const block of allBlocks) {
    if (placeholderTypesSet.has(block.type) && !implementedMap.has(block.type)) {
      implementedMap.set(block.type, block);
    } else {
      // Nếu block type thuộc nhóm placeholder nhưng không khớp placeholder nào của template hiện tại -> coi là block mồ côi, ẩn khỏi render
      if (PLACEHOLDER_TYPES.has(block.type) && !placeholderTypesSet.has(block.type)) {
        continue;
      }
      outletBlocks.push(block);
    }
  }

  // 3. Render theo thứ tự placeholders của Template
  const rendered: Block[] = [];
  for (const placeholder of placeholders) {
    if (placeholder.type === 'content-outlet') {
      // Toàn bộ block tự do của page trong outlet, giữ nguyên thứ tự orderIndex của chúng
      const sortedOutlet = [...outletBlocks].sort((a, b) => a.orderIndex - b.orderIndex);
      rendered.push(...sortedOutlet);
    } else {
      const impl = implementedMap.get(placeholder.type);
      if (impl) {
        rendered.push(impl);
      }
    }
  }

  return rendered;
}
