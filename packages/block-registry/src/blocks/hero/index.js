"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heroSchema = exports.heroBlock = void 0;
const schema_1 = require("./schema");
Object.defineProperty(exports, "heroSchema", { enumerable: true, get: function () { return schema_1.heroSchema; } });
exports.heroBlock = {
    type: 'hero',
    label: 'Hero Section',
    icon: 'LayoutTemplate',
    thumbnail: '/block-thumbnails/hero.png',
    schema: schema_1.heroSchema,
    defaultData: {
        title: 'Your compelling headline here',
        subtitle: 'Supporting text that adds context',
        image: { mediaId: '', alt: '' },
        buttonText: 'Get Started',
        buttonHref: '',
        alignment: 'center',
        overlayOpacity: 40,
    },
};
//# sourceMappingURL=index.js.map