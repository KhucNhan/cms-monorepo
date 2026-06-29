"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockRegistry = void 0;
exports.getBlockDefinition = getBlockDefinition;
exports.getAllBlockDefinitions = getAllBlockDefinitions;
exports.isValidBlockType = isValidBlockType;
const hero_1 = require("./blocks/hero");
const rich_text_1 = require("./blocks/rich-text");
const faq_1 = require("./blocks/faq");
const ALL_BLOCKS = [
    hero_1.heroBlock,
    rich_text_1.richTextBlock,
    faq_1.faqBlock,
];
exports.blockRegistry = new Map(ALL_BLOCKS.map((def) => [def.type, def]));
function getBlockDefinition(type) {
    const def = exports.blockRegistry.get(type);
    if (!def) {
        throw new Error(`Unknown block type: "${type}". ` +
            `Available types: [${[...exports.blockRegistry.keys()].join(', ')}]`);
    }
    return def;
}
function getAllBlockDefinitions() {
    return [...exports.blockRegistry.values()];
}
function isValidBlockType(type) {
    return exports.blockRegistry.has(type);
}
//# sourceMappingURL=registry.js.map