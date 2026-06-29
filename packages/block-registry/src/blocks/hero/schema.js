"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heroSchema = void 0;
const zod_1 = require("zod");
exports.heroSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Title is required')
        .max(120, 'Title must be 120 characters or less'),
    subtitle: zod_1.z
        .string()
        .max(240, 'Subtitle must be 240 characters or less')
        .optional(),
    image: zod_1.z.object({
        mediaId: zod_1.z.string(),
        alt: zod_1.z.string().max(255),
        url: zod_1.z.string().optional(),
    }),
    buttonText: zod_1.z
        .string()
        .max(40, 'Button text must be 40 characters or less')
        .optional(),
    buttonHref: zod_1.z
        .string()
        .max(500, 'URL must be 500 characters or less')
        .optional(),
    alignment: zod_1.z.enum(['left', 'center', 'right']).default('center'),
    overlayOpacity: zod_1.z.number().int().min(0).max(100).default(40),
});
//# sourceMappingURL=schema.js.map