"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgMetaShape = void 0;
const gubu_1 = require("gubu");
const { Skip } = gubu_1.Gubu;
// Contents of '$' leaf
const MsgMetaShape = (0, gubu_1.Gubu)({
    file: Skip(String),
    params: Skip({}),
    transport: Skip({
        queue: {
            active: false,
            timeout: Number,
            suffix: String,
        }
    }),
}, { prefix: 'MsgMeta' });
exports.MsgMetaShape = MsgMetaShape;
//# sourceMappingURL=msg.js.map