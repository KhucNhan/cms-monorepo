"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.faqSchema = exports.richTextSchema = exports.heroSchema = void 0;
/**
 * @cms/block-registry/schema-only
 *
 * Entry point dành riêng cho NestJS (admin-api).
 * Chỉ export schema + registry functions — không có Editor/Renderer React.
 * Đảm bảo NestJS không kéo React, DOM, browser API vào bundle Node.
 */
__exportStar(require("./src/types"), exports);
__exportStar(require("./src/registry"), exports);
var schema_1 = require("./src/blocks/hero/schema");
Object.defineProperty(exports, "heroSchema", { enumerable: true, get: function () { return schema_1.heroSchema; } });
var schema_2 = require("./src/blocks/rich-text/schema");
Object.defineProperty(exports, "richTextSchema", { enumerable: true, get: function () { return schema_2.richTextSchema; } });
var schema_3 = require("./src/blocks/faq/schema");
Object.defineProperty(exports, "faqSchema", { enumerable: true, get: function () { return schema_3.faqSchema; } });
