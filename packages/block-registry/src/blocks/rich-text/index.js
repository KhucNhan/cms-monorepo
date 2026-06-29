"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.richTextSchema = exports.richTextBlock = void 0;
const schema_1 = require("./schema");
Object.defineProperty(exports, "richTextSchema", { enumerable: true, get: function () { return schema_1.richTextSchema; } });
exports.richTextBlock = {
    type: 'rich-text',
    label: 'Rich Text',
    icon: 'FileText',
    schema: schema_1.richTextSchema,
    defaultData: {
        content: {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Start writing here...' }],
                },
            ],
        },
        htmlFallback: '<p>Start writing here...</p>',
        textAlign: 'left',
    },
};
//# sourceMappingURL=index.js.map