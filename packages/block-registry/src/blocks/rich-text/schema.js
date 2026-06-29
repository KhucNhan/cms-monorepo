"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.richTextSchema = void 0;
const zod_1 = require("zod");
exports.richTextSchema = zod_1.z.object({
    content: zod_1.z.record(zod_1.z.unknown()),
    htmlFallback: zod_1.z.string(),
    textAlign: zod_1.z.enum(['left', 'center', 'right', 'justify']).default('left'),
});
//# sourceMappingURL=schema.js.map