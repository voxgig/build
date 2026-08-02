"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntShape = void 0;
const gubu_1 = require("gubu");
const { Open, Skip } = gubu_1.Gubu;
// Open: entities may carry extra attributes beyond the deployment-relevant
// ones below (e.g. `ux` for frontend view hints), which this generator ignores.
const EntShape = (0, gubu_1.Gubu)(Open({
    id: {
        field: 'id'
    },
    title: 'Title',
    field: Open({}).Child({}),
    valid: Open({}),
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
}), { prefix: 'Entity' });
exports.EntShape = EntShape;
//# sourceMappingURL=ent.js.map