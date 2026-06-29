"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faqSchema = void 0;
const zod_1 = require("zod");
const faqItemSchema = zod_1.z.object({
    question: zod_1.z
        .string()
        .min(1, 'Question is required')
        .max(300, 'Question must be 300 characters or less'),
    answer: zod_1.z
        .string()
        .min(1, 'Answer is required')
        .max(2000, 'Answer must be 2000 characters or less'),
});
exports.faqSchema = zod_1.z.object({
    heading: zod_1.z
        .string()
        .max(120, 'Heading must be 120 characters or less')
        .optional(),
    items: zod_1.z
        .array(faqItemSchema)
        .min(1, 'At least one FAQ item is required')
        .max(20, 'Maximum 20 FAQ items'),
    allowMultipleOpen: zod_1.z.boolean().default(false),
});
//# sourceMappingURL=schema.js.map