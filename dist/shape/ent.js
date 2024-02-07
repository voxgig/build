"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntShape = void 0;
const gubu_1 = require("gubu");
const { Open, Skip } = gubu_1.Gubu;
const EntShape = (0, gubu_1.Gubu)({
    id: {
        field: 'id'
    },
    field: Open({}).Child({}),
    index: Open({}).Child({}),
    resource: Open({
        name: ''
    }),
    dynamo: Open({
        active: false,
        prefix: '',
        suffix: '',
    }),
    stage: Open({
        active: false
    }),
    custom: Skip(String),
}, { prefix: 'Entity' });
exports.EntShape = EntShape;
//# sourceMappingURL=ent.js.map