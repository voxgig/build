"use strict";
/* Copyright © 2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KINDS = exports.ENV_SRC = exports.ENV_FILES = exports.env_gen = void 0;
// EnvGen: per-environment deployment artifact generation. The project
// model declares its target environments under `main: env:`:
//
//   main: env: local: { active: true }
//   main: env: aws: { active: true, region: 'eu-west-1', stage: 'dev' }
//
// For each active environment this generates gen/env/<name>/ from the
// fragment set tm/env/<kind>/ (kind defaults to the env name, so a
// project can declare e.g. `aws2: { kind: 'aws', region: ... }`).
// Fragments are project-shadowable via spec.tm (the project's tm/env
// folder), like the lambda templates.
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("@voxgig/util");
const conf_1 = require("../shape/conf");
const generate_1 = require("./lambda/generate");
// The supported environment kinds and the files each generates.
// `out` may contain $$slots$$ (rendered with the same slot values).
const ENV_FILES = {
    local: [
        { frag: 'local/run.sh.frag', out: 'run.sh' },
        { frag: 'local/README.md.frag', out: 'README.md' },
    ],
    basic: [
        { frag: 'basic/backend.service.frag', out: '$$name$$-backend.service' },
        { frag: 'basic/deploy.sh.frag', out: 'deploy.sh' },
        { frag: 'basic/README.md.frag', out: 'README.md' },
    ],
    docker: [
        { frag: 'docker/Dockerfile.frag', out: 'Dockerfile' },
        { frag: 'docker/compose.yml.frag', out: 'compose.yml' },
        { frag: 'docker/README.md.frag', out: 'README.md' },
    ],
    vm: [
        { frag: 'vm/cloud-init.yaml.frag', out: 'cloud-init.yaml' },
        { frag: 'vm/README.md.frag', out: 'README.md' },
    ],
    aws: [
        { frag: 'aws/serverless.yml.frag', out: 'serverless.yml' },
        { frag: 'aws/README.md.frag', out: 'README.md' },
    ],
    azure: [
        { frag: 'azure/host.json.frag', out: 'host.json' },
        { frag: 'azure/README.md.frag', out: 'README.md' },
    ],
    cloudflare: [
        { frag: 'cloudflare/wrangler.toml.frag', out: 'wrangler.toml' },
        { frag: 'cloudflare/README.md.frag', out: 'README.md' },
    ],
};
exports.ENV_FILES = ENV_FILES;
// The runtime entry point + Seneca config setup each environment needs
// under src/env/. These are generated ONCE (only when missing): after
// creation the project owns them, like the scaffold's local entry. All
// entries route Seneca configuration through src/env/shared/basic.ts.
// `dir` is relative to the project src/env folder.
const ENV_SRC = {
    local: [], // scaffold provides src/env/local/local.ts
    basic: [
        { frag: 'server.entry.ts.frag', dir: 'basic', out: 'basic.ts' },
    ],
    docker: [
        { frag: 'server.entry.ts.frag', dir: 'docker', out: 'docker.ts' },
    ],
    vm: [
        { frag: 'server.entry.ts.frag', dir: 'vm', out: 'vm.ts' },
    ],
    aws: [
        // The Lambda bootstrap the generated handlers import.
        { frag: 'aws/lambda.entry.ts.frag', dir: 'lambda', out: 'lambda.ts' },
    ],
    azure: [
        { frag: 'azure/entry.ts.frag', dir: 'azure', out: 'azure.ts' },
    ],
    cloudflare: [
        { frag: 'cloudflare/worker.ts.frag', dir: 'cloudflare', out: 'worker.ts' },
    ],
};
exports.ENV_SRC = ENV_SRC;
const KINDS = Object.keys(ENV_FILES);
exports.KINDS = KINDS;
const env_gen = async (model, spec) => {
    var _a;
    const core = (0, conf_1.CoreConfShape)(model.main.conf.core);
    const envs = model.main.env || {};
    for (const entry of Object.entries(envs)) {
        const name = entry[0];
        const def = entry[1] || {};
        if (false === def.active) {
            continue;
        }
        const kind = def.kind || name;
        const filedefs = ENV_FILES[kind];
        if (null == filedefs) {
            throw new Error('@voxgig/build: unknown environment kind: ' + kind +
                ' (env ' + name + '; known kinds: ' + KINDS.join(', ') + ')');
        }
        // Slot values: project identity, ports, and per-env config with
        // sensible defaults. Additional scalar config keys on the env
        // definition become slots too.
        const slots = {
            name: core.name,
            Name: (0, util_1.camelify)(core.name),
            env: name,
            port: ((_a = model.main.conf.port) === null || _a === void 0 ? void 0 : _a.backend) || 8080,
            node: def.node || '22',
            region: def.region || 'us-east-1',
            stage: def.stage || 'dev',
        };
        for (const key of Object.keys(def)) {
            if ('object' !== typeof def[key] && null == slots[key]) {
                slots[key] = def[key];
            }
        }
        // Slot for the env name inside entry fragments.
        slots.env = name;
        const files = filedefs.map((fd) => ({
            name: (0, generate_1.renderFragment)(fd.out, slots),
            content: (0, generate_1.renderFragment)((0, generate_1.loadFragment)(fd.frag, spec, 'env'), slots),
        }));
        await (0, generate_1.generate)(spec.folder + '/' + name, files);
        // Runtime entries: create-once into src/env (user-owned afterwards).
        if (null != spec.src) {
            for (const sd of (ENV_SRC[kind] || [])) {
                const dest = path_1.default.join(spec.src, sd.dir, (0, generate_1.renderFragment)(sd.out, slots));
                if (!fs_1.default.existsSync(dest)) {
                    const content = (0, generate_1.renderFragment)((0, generate_1.loadFragment)(sd.frag, spec, 'env'), slots);
                    fs_1.default.mkdirSync(path_1.default.dirname(dest), { recursive: true });
                    fs_1.default.writeFileSync(dest, content);
                }
            }
        }
    }
};
exports.env_gen = env_gen;
//# sourceMappingURL=env_gen.js.map