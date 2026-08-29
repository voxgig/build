"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgMetaShape = void 0;
const gubu_1 = require("gubu");
const { Skip } = gubu_1.Gubu;
// A message's metadata, from either declaration shape: the contents of a
// legacy '$' leaf, or a declared-shape definition with its `pat` removed
// (util.ts msgentries strips it, since the pattern is not metadata).
//
// The declared fields below are the ones @voxgig/model's message schema
// names. They are Skip()ed rather than required because a definition declares
// only what it needs, and because a legacy '$' leaf carries none of them.
const MsgMetaShape = (0, gubu_1.Gubu)({
    file: Skip(String),
    params: Skip({}),
    // Declared shape only.
    doc: Skip(String),
    out: Skip({}),
    web: Skip({}),
    api: Skip({}),
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