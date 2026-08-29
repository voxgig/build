"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indent = indent;
exports.ismsgdef = ismsgdef;
exports.msgentries = msgentries;
exports.aimmsgs = aimmsgs;
exports.msgindex = msgindex;
function indent(text, size) {
    let lines = text.split('\n');
    const prefix = ' '.repeat(size);
    lines = lines.map(line => prefix + line + '\n');
    const tout = lines.join('');
    return tout;
}
// A message definition declares its pattern as a LIST; a chain node never
// does, because every value in a chain node is a map - the next pattern level,
// or the '$' leaf. So this tells the two shapes apart even for a legacy
// pattern pair spelled `pat:`. It is the same discriminator @voxgig/model
// validates the declared shape with (see its producer/msg.ts).
function ismsgdef(val) {
    return null != val && 'object' === typeof val &&
        !Array.isArray(val) && Array.isArray(val.pat);
}
// The pattern of a declared-shape definition, flattened to the pair sequence
// [k,v,k,v,...] the chain walk produces. A malformed pair is skipped rather
// than thrown on: @voxgig/model fails the build on those, so one arriving here
// came from somewhere else and dropping it degrades better than crashing a
// generator.
function msgdefpairs(def) {
    const pairs = [];
    for (const pair of def.pat) {
        if (null == pair || 'object' !== typeof pair || Array.isArray(pair)) {
            continue;
        }
        const keys = Object.keys(pair);
        if (1 === keys.length) {
            pairs.push(keys[0], pair[keys[0]]);
        }
    }
    return pairs;
}
// Flatten a main.msg subtree to [path, meta] entries, reading BOTH declaration
// shapes: the legacy chain, where the nesting is the pattern and '$' carries
// the metadata, and the declared shape, where a flat entry's `pat` list IS the
// pattern.
//
// This is a drop-in for @voxgig/util's dive() over a message tree - same entry
// shape, same '$' handling, same even-length pair paths that pinify() and the
// queue-name builders assume - with one extra branch for definitions. dive()
// cannot be used directly any more: fed a definition it would walk the
// metadata and emit one entry per scalar field.
function msgentries(node, depth = 128) {
    const out = [];
    walkmsgs(node, [], depth, out);
    return out;
}
function walkmsgs(node, prefix, depth, out) {
    if (null == node || 'object' !== typeof node) {
        return;
    }
    for (const key of Object.keys(node)) {
        const child = node[key];
        if ('$' === key) {
            out.push([prefix.slice(), child]);
        }
        else if (ismsgdef(child)) {
            const meta = { ...child };
            delete meta.pat;
            out.push([prefix.concat(msgdefpairs(child)), meta]);
        }
        else if (depth <= 1 || null == child || 'object' !== typeof child ||
            0 === Object.keys(child).length) {
            out.push([prefix.concat(key), child]);
        }
        else {
            walkmsgs(child, prefix.concat(key), depth - 1, out);
        }
    }
}
// The messages aimed at one service, with the leading aim pair dropped so the
// remaining path is the message's own pattern.
//
// Selecting by path rather than indexing main.msg.aim[name] is what makes the
// declared shape work here at all: a definition lives at main.msg.<name> with
// `aim` as its first pattern pair, not under main.msg.aim. It also stops a
// service with no messages from throwing.
function aimmsgs(msg, aim) {
    return msgentries(msg)
        .filter((entry) => 'aim' === entry[0][0] && aim === entry[0][1])
        .map((entry) => [entry[0].slice(2), entry[1]]);
}
// Message metadata by pattern path, for looking up a message named elsewhere
// in the model (a service's `out` list, say) in either shape.
function msgindex(msg) {
    const index = {};
    for (const entry of msgentries(msg)) {
        index[entry[0].join(',')] = entry[1];
    }
    return index;
}
//# sourceMappingURL=util.js.map