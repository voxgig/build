"use strict";
/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = generate;
exports.empty = empty;
exports.TM = TM;
// Shared generation utilities for the lambda templates. File output goes
// through the jostraca templating library (Project/File/Content components),
// which also maintains .jostraca/ build metadata next to the outputs.
const jostraca_1 = require("jostraca");
// Generate one or more files in folder, each with exact content.
async function generate(folder, files) {
    const jostraca = (0, jostraca_1.Jostraca)();
    await jostraca.generate({ folder }, () => {
        (0, jostraca_1.Project)({}, () => {
            for (const f of files) {
                (0, jostraca_1.File)({ name: f.name }, () => {
                    (0, jostraca_1.Content)(f.content);
                });
            }
        });
    });
}
function empty(o) {
    return null == o ? true : 0 === Object.keys(o).length;
}
// Strip inital newline
function TM(str) {
    return str.replace(/^\n/, '');
}
//# sourceMappingURL=generate.js.map