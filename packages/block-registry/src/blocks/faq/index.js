"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faqSchema = exports.faqBlock = void 0;
const schema_1 = require("./schema");
Object.defineProperty(exports, "faqSchema", { enumerable: true, get: function () { return schema_1.faqSchema; } });
exports.faqBlock = {
    type: 'faq',
    label: 'FAQ',
    icon: 'HelpCircle',
    schema: schema_1.faqSchema,
    defaultData: {
        heading: 'Frequently Asked Questions',
        items: [
            {
                question: 'What is your return policy?',
                answer: 'We offer a 30-day return policy on all items.',
            },
        ],
        allowMultipleOpen: false,
    },
};
//# sourceMappingURL=index.js.map