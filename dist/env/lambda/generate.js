"use strict";
/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKG_TM = void 0;
exports.generate = generate;
exports.empty = empty;
exports.TM = TM;
exports.loadFragment = loadFragment;
exports.renderFragment = renderFragment;
exports.listFragments = listFragments;
// Shared generation utilities for the lambda templates. File output goes
// through the jostraca templating library (Project/File/Content components),
// which also maintains .jostraca/ build metadata next to the outputs.
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jostraca_1 = require("jostraca");
// The text shape of each generated output lives in a jostraca-style
// fragment file with $$slot$$ placeholders. Fragments ship with this
// package under tm/lambda/, and a project can shadow any of them by
// placing a same-named file in its own tm folder (passed as spec.tm by
// the project's build actions). The fragment file's final newline is
// dropped at load, so slot values fully control trailing bytes.
// Package tm folder: compiled code lives at <pkg>/dist/env/lambda (three
// levels down), but test transforms run the source at <pkg>/env/lambda
// (two levels down) - probe both.
const PKG_TM = [
    path_1.default.join(__dirname, '..', '..', '..', 'tm', 'lambda'),
    path_1.default.join(__dirname, '..', '..', 'tm', 'lambda'),
].find((p) => fs_1.default.existsSync(p)) ||
    path_1.default.join(__dirname, '..', '..', '..', 'tm', 'lambda');
exports.PKG_TM = PKG_TM;
function loadFragment(name, spec) {
    const candidates = [];
    if (spec === null || spec === void 0 ? void 0 : spec.tm) {
        candidates.push(path_1.default.join(spec.tm, name));
    }
    candidates.push(path_1.default.join(PKG_TM, name));
    for (const c of candidates) {
        if (fs_1.default.existsSync(c)) {
            let src = fs_1.default.readFileSync(c, 'utf8');
            if (src.endsWith('\n')) {
                src = src.substring(0, src.length - 1);
            }
            return src;
        }
    }
    throw new Error('@voxgig/build: fragment not found: ' + name +
        ' (looked in ' + candidates.join(', ') + ')');
}
// Literal $$slot$$ substitution (split/join - values are never
// interpreted, so ${...}, $&, etc. pass through untouched).
function renderFragment(src, slots) {
    let out = src;
    for (const key of Object.keys(slots)) {
        out = out.split('$$' + key + '$$').join(String(slots[key]));
    }
    return out;
}
// Fragment names shipped by this package (for tooling: list/eject).
function listFragments() {
    return fs_1.default.readdirSync(PKG_TM).filter((f) => f.endsWith('.frag')).sort();
}
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