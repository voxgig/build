"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indent = void 0;
function indent(text, size) {
    let lines = text.split('\n');
    const prefix = ' '.repeat(size);
    lines = lines.map(line => prefix + line + '\n');
    const tout = lines.join('');
    return tout;
}
exports.indent = indent;
//# sourceMappingURL=util.js.map