"use strict";
/* Copyright © 2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api_gen = void 0;
// Api: generation for the strict-JSON REST API (model main.api).
// Regenerated on every model-build (pure functions of the model,
// content-diffed, AUTO-GENERATED):
//
//   backend/gen/api/openapi.json      OpenAPI 3.1 spec; schemas from the
//                                     entity field definitions
//   backend/src/srv/api/valid_gen.ts  gubu shapes per exposed entity op,
//                                     used by the api service to validate
//                                     request bodies (strict: closed)
//
// Exposure rules (same as the api service's expose.ts): application
// entities are exposed by default, the sys zone never is, per-entity
// overrides live under main.api.ent.
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Server-managed fields: never client-writable (and readOnly in OpenAPI).
const MANAGED = ['id', 'owner_id', 't_c', 't_m'];
function apiConf(model) {
    const api = (model.main && model.main.api) || {};
    return {
        active: false !== api.active && null != model.main.api,
        prefix: api.prefix || '/api',
        version: api.version || 'v1',
        ent: api.ent || {},
    };
}
function exposed(model) {
    const conf = apiConf(model);
    const out = [];
    const zones = (model.main && model.main.ent) || {};
    for (const zone of Object.keys(zones)) {
        if ('sys' === zone) {
            continue;
        }
        for (const name of Object.keys(zones[zone])) {
            const canon = zone + '/' + name;
            const entconf = conf.ent[canon];
            if (entconf && false === entconf.active) {
                continue;
            }
            out.push({ canon, zone, name, def: zones[zone][name] || {} });
        }
    }
    return out.sort((a, b) => a.canon < b.canon ? -1 : 1);
}
function fieldsOf(def) {
    const out = [];
    const fields = def.field || {};
    for (const fname of Object.keys(fields).sort()) {
        const f = fields[fname] || {};
        const valid = null == f.valid ? '' : String(f.valid);
        out.push({
            name: fname,
            kind: ['String', 'Number', 'Boolean'].includes(f.kind) ? f.kind : 'String',
            required: !MANAGED.includes(fname) && !/Skip/.test(valid),
            managed: MANAGED.includes(fname),
            label: f.label || fname,
            ref: f.ref,
        });
    }
    return out;
}
// ---- valid_gen.ts ----
function validGenTs(model) {
    const ents = exposed(model);
    const lines = [];
    lines.push('/* AUTO-GENERATED from the model by @voxgig/build (api_gen) - do not edit.');
    lines.push('   Regenerated on every model-build. */');
    lines.push('');
    lines.push('// Request-body validation shapes for the REST API, derived from the');
    lines.push('// entity field definitions. Shapes are CLOSED (strict JSON: unknown');
    lines.push('// fields are rejected); server-managed fields (' + MANAGED.join(', ') + ')');
    lines.push('// are excluded entirely. create requires the required fields; update');
    lines.push('// accepts any subset (partial).');
    lines.push('');
    lines.push('module.exports = function makeShapes(Gubu: any) {');
    lines.push('  const { Skip } = Gubu');
    lines.push('  const shapes: any = {}');
    lines.push('');
    for (const e of ents) {
        const flds = fieldsOf(e.def).filter((f) => !f.managed);
        const create = flds.map((f) => `      ${f.name}: ${f.required ? f.kind : `Skip(${f.kind})`},`);
        const update = flds.map((f) => `      ${f.name}: Skip(${f.kind}),`);
        lines.push(`  shapes['${e.canon}'] = {`);
        lines.push('    create: Gubu({');
        lines.push(...create);
        lines.push('    }),');
        lines.push('    update: Gubu({');
        lines.push(...update);
        lines.push('    }),');
        lines.push('  }');
        lines.push('');
    }
    lines.push('  return shapes');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
}
// ---- openapi.json ----
const KINDTYPE = {
    String: 'string', Number: 'number', Boolean: 'boolean',
};
function openapi(model) {
    const conf = apiConf(model);
    const core = (model.main.conf && model.main.conf.core) || {};
    const ents = exposed(model);
    const schemas = {
        Error: {
            type: 'object',
            additionalProperties: false,
            properties: {
                error: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                        code: { type: 'string' },
                        message: { type: 'string' },
                        details: { type: 'array', items: { type: 'object' } },
                    },
                    required: ['code'],
                },
            },
            required: ['error'],
        },
    };
    const paths = {};
    for (const e of ents) {
        const sname = schemaName(e.canon);
        const flds = fieldsOf(e.def);
        const properties = {};
        const required = [];
        for (const f of flds) {
            properties[f.name] = { type: KINDTYPE[f.kind], title: f.label };
            if (f.managed) {
                properties[f.name].readOnly = true;
            }
            if (f.ref) {
                properties[f.name].description = 'Reference to ' + f.ref;
            }
            if (f.required) {
                required.push(f.name);
            }
        }
        schemas[sname] = {
            type: 'object',
            additionalProperties: false,
            properties,
            ...(required.length ? { required } : {}),
        };
        const ref = { $ref: '#/components/schemas/' + sname };
        const errRef = { $ref: '#/components/schemas/Error' };
        const errResponses = {
            '400': { description: 'Invalid request', content: { 'application/json': { schema: errRef } } },
            '401': { description: 'Missing or invalid API key', content: { 'application/json': { schema: errRef } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: errRef } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: errRef } } },
        };
        const itemResult = (desc) => ({
            description: desc,
            content: {
                'application/json': {
                    schema: {
                        type: 'object', additionalProperties: false,
                        properties: { item: ref }, required: ['item'],
                    },
                },
            },
        });
        const base = '/' + conf.version + '/' + e.canon;
        paths[base] = {
            get: {
                operationId: opId('list', e), summary: 'List ' + e.name + ' entities',
                tags: [e.canon],
                parameters: flds.map((f) => ({
                    name: f.name, in: 'query', required: false,
                    schema: { type: KINDTYPE[f.kind] },
                    description: 'Filter by ' + f.name,
                })),
                responses: {
                    '200': {
                        description: 'Matching ' + e.name + ' entities',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object', additionalProperties: false,
                                    properties: { items: { type: 'array', items: ref } },
                                    required: ['items'],
                                },
                            },
                        },
                    },
                    ...errResponses,
                },
            },
            post: {
                operationId: opId('create', e), summary: 'Create a ' + e.name,
                tags: [e.canon],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: ref } },
                },
                responses: { '201': itemResult('The created ' + e.name), ...errResponses },
            },
        };
        paths[base + '/{id}'] = {
            parameters: [{
                    name: 'id', in: 'path', required: true, schema: { type: 'string' },
                }],
            get: {
                operationId: opId('load', e), summary: 'Load one ' + e.name,
                tags: [e.canon],
                responses: { '200': itemResult('The ' + e.name), ...errResponses },
            },
            put: {
                operationId: opId('update', e), summary: 'Update a ' + e.name + ' (partial)',
                tags: [e.canon],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: ref } },
                },
                responses: { '200': itemResult('The updated ' + e.name), ...errResponses },
            },
            delete: {
                operationId: opId('remove', e), summary: 'Remove a ' + e.name,
                tags: [e.canon],
                responses: {
                    '200': {
                        description: 'Removed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object', additionalProperties: false,
                                    properties: { ok: { type: 'boolean' }, id: { type: 'string' } },
                                    required: ['ok', 'id'],
                                },
                            },
                        },
                    },
                    ...errResponses,
                },
            },
        };
    }
    return {
        openapi: '3.1.0',
        info: {
            title: (core.name || 'system') + ' API',
            version: conf.version,
            description: 'Strict-JSON REST API, generated from the model. ' +
                'Uniform entity paths: <zone>/<name>[/<id>].',
        },
        servers: [{ url: conf.prefix }],
        security: [{ bearerAuth: [] }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http', scheme: 'bearer',
                    description: 'API access key (create one under Settings & security)',
                },
            },
            schemas,
        },
        paths,
    };
}
// Uniform operation ids for SDK generation: list_proj_project, ...
function opId(op, e) {
    return op + '_' + e.zone + '_' + e.name;
}
function schemaName(canon) {
    return canon.split('/').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}
function writeIfChanged(dest, content) {
    const existing = fs_1.default.existsSync(dest) ? fs_1.default.readFileSync(dest, 'utf8') : null;
    if (existing === content) {
        return false;
    }
    fs_1.default.mkdirSync(path_1.default.dirname(dest), { recursive: true });
    fs_1.default.writeFileSync(dest, content);
    return true;
}
// api_gen(model, spec): generate the REST API artifacts. No-op unless
// the model declares main.api. Returns { created }.
const api_gen = async (model, spec) => {
    const created = [];
    if (null == (model.main && model.main.api)) {
        return { created };
    }
    const spec_json = JSON.stringify(openapi(model), null, 2) + '\n';
    if (writeIfChanged(path_1.default.join(spec.root, 'backend', 'gen', 'api', 'openapi.json'), spec_json)) {
        created.push('backend/gen/api/openapi.json');
    }
    // The validation shapes land next to the api service - only when the
    // service is implemented (its folder exists).
    const srvapi = path_1.default.join(spec.root, 'backend', 'src', 'srv', 'api');
    if (fs_1.default.existsSync(srvapi)) {
        if (writeIfChanged(path_1.default.join(srvapi, 'valid_gen.ts'), validGenTs(model))) {
            created.push('backend/src/srv/api/valid_gen.ts');
        }
    }
    return { created: created.sort() };
};
exports.api_gen = api_gen;
//# sourceMappingURL=api_gen.js.map