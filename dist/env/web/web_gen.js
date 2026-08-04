"use strict";
/* Copyright © 2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USERS = exports.WEB_FILES = exports.web_gen = void 0;
// EnvWeb: generate the experimental web frontend - a Single Page App built
// from web components on a client-side Seneca service bus (no React/Vue) -
// plus the backend web runner and auth service it needs.
//
// Everything EnvWeb generates is CREATE-ONCE: a project owns its frontend
// after generation (the SPA is a starting point users heavily customize).
// Fragments live in @voxgig/build tm/web/ and are project-shadowable via
// spec.tm (the project's tm/web folder), like every other template.
//
// The entity admin is model-driven at RUNTIME (it fetches the compiled
// model.json), so the generated SPA adapts to any model with no
// per-entity code generation.
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("@voxgig/util");
const conf_1 = require("../../shape/conf");
const generate_1 = require("../lambda/generate");
// File manifest: fragment (relative to tm/web) -> output path (relative to
// the project root, which holds backend/ and web/). $$slots$$ in the
// output path are rendered too.
const WEB_FILES = [
    // Frontend SPA (web/) — a model-driven enterprise app: public site + login,
    // an app shell (nav / project selector / user menu / collapsible entity
    // menu), and generic CRUD with relationship navigation. All runtime
    // model-driven (model.js reads /model.json), so it fits any entity graph.
    { frag: 'web/package.json.frag', out: '$$fe$$/package.json' },
    { frag: 'web/index.html.frag', out: '$$fe$$/index.html' },
    { frag: 'web/playwright.config.js.frag', out: '$$fe$$/playwright.config.js' },
    { frag: 'web/src/main.js.frag', out: '$$fe$$/src/main.js' },
    { frag: 'web/src/bus.js.frag', out: '$$fe$$/src/bus.js' },
    { frag: 'web/src/model.js.frag', out: '$$fe$$/src/model.js' },
    { frag: 'web/src/api.js.frag', out: '$$fe$$/src/api.js' },
    { frag: 'web/src/hooks.js.frag', out: '$$fe$$/src/hooks.js' },
    { frag: 'web/src/theme.js.frag', out: '$$fe$$/src/theme.js' },
    { frag: 'web/src/customise.js.frag', out: '$$fe$$/src/customise.js' },
    { frag: 'web/src/custom.css.frag', out: '$$fe$$/src/custom.css' },
    { frag: 'web/src/style.css.frag', out: '$$fe$$/src/style.css' },
    { frag: 'web/src/cmp/app.js.frag', out: '$$fe$$/src/cmp/app.js' },
    { frag: 'web/src/cmp/public.js.frag', out: '$$fe$$/src/cmp/public.js' },
    { frag: 'web/src/cmp/auth.js.frag', out: '$$fe$$/src/cmp/auth.js' },
    { frag: 'web/src/cmp/shell.js.frag', out: '$$fe$$/src/cmp/shell.js' },
    { frag: 'web/src/cmp/admin.js.frag', out: '$$fe$$/src/cmp/admin.js' },
    { frag: 'web/src/cmp/settings.js.frag', out: '$$fe$$/src/cmp/settings.js' },
    // Per-component doc sidecars (mermaid structure + message diagrams),
    // create-once next to each component.
    { frag: 'web/src/cmp/app.md.frag', out: '$$fe$$/src/cmp/app.md' },
    { frag: 'web/src/cmp/public.md.frag', out: '$$fe$$/src/cmp/public.md' },
    { frag: 'web/src/cmp/auth.md.frag', out: '$$fe$$/src/cmp/auth.md' },
    { frag: 'web/src/cmp/shell.md.frag', out: '$$fe$$/src/cmp/shell.md' },
    { frag: 'web/src/cmp/admin.md.frag', out: '$$fe$$/src/cmp/admin.md' },
    { frag: 'web/src/cmp/settings.md.frag', out: '$$fe$$/src/cmp/settings.md' },
    { frag: 'web/e2e/smoke.spec.js.frag', out: '$$fe$$/e2e/smoke.spec.js' },
    { frag: 'web/AGENTS.md.frag', out: '$$fe$$/AGENTS.md' },
    // Project docs (Diátaxis) for the web app, alongside the scaffold's
    // backend docs (@voxgig/create-system DocsPart). Create-once like all
    // WEB_FILES: the project owns its docs after generation.
    { frag: 'docs/how-to/customise-the-web-app.md.frag', out: 'docs/how-to/customise-the-web-app.md' },
    { frag: 'docs/how-to/use-the-api.md.frag', out: 'docs/how-to/use-the-api.md' },
    { frag: 'docs/how-to/change-the-theme.md.frag', out: 'docs/how-to/change-the-theme.md' },
    { frag: 'docs/how-to/add-a-custom-entity-view.md.frag', out: 'docs/how-to/add-a-custom-entity-view.md' },
    { frag: 'docs/reference/web-app.md.frag', out: 'docs/reference/web-app.md' },
    { frag: 'docs/explanation/web-architecture.md.frag', out: 'docs/explanation/web-architecture.md' },
    // Backend web runner + auth service (backend/src/...)
    { frag: 'backend/env/web/web.ts.frag', out: 'backend/src/env/web/web.ts' },
    { frag: 'backend/env/shared/seed.ts.frag', out: 'backend/src/env/shared/seed.ts' },
    { frag: 'backend/srv/auth/auth-srv.ts.frag', out: 'backend/src/srv/auth/auth-srv.ts' },
    { frag: 'backend/srv/auth/user_util.ts.frag', out: 'backend/src/srv/auth/user_util.ts' },
    { frag: 'backend/srv/auth/get_info.ts.frag', out: 'backend/src/srv/auth/get_info.ts' },
    { frag: 'backend/srv/auth/signin_user.ts.frag', out: 'backend/src/srv/auth/signin_user.ts' },
    { frag: 'backend/srv/auth/signout_user.ts.frag', out: 'backend/src/srv/auth/signout_user.ts' },
    { frag: 'backend/srv/auth/load_auth.ts.frag', out: 'backend/src/srv/auth/load_auth.ts' },
    { frag: 'backend/srv/auth/web_signin_user.ts.frag', out: 'backend/src/srv/auth/web_signin_user.ts' },
    { frag: 'backend/srv/auth/web_signout_user.ts.frag', out: 'backend/src/srv/auth/web_signout_user.ts' },
    { frag: 'backend/srv/auth/web_load_auth.ts.frag', out: 'backend/src/srv/auth/web_load_auth.ts' },
    // Auth settings/security extensions.
    { frag: 'backend/srv/auth/change_pass.ts.frag', out: 'backend/src/srv/auth/change_pass.ts' },
    { frag: 'backend/srv/auth/web_change_pass.ts.frag', out: 'backend/src/srv/auth/web_change_pass.ts' },
    { frag: 'backend/srv/auth/update_user.ts.frag', out: 'backend/src/srv/auth/update_user.ts' },
    { frag: 'backend/srv/auth/web_update_user.ts.frag', out: 'backend/src/srv/auth/web_update_user.ts' },
    { frag: 'backend/srv/auth/remind_pass.ts.frag', out: 'backend/src/srv/auth/remind_pass.ts' },
    { frag: 'backend/srv/auth/web_remind_pass.ts.frag', out: 'backend/src/srv/auth/web_remind_pass.ts' },
    // API access keys (Settings & security + REST API auth).
    { frag: 'backend/srv/auth/apikey_util.ts.frag', out: 'backend/src/srv/auth/apikey_util.ts' },
    { frag: 'backend/srv/auth/create_apikey.ts.frag', out: 'backend/src/srv/auth/create_apikey.ts' },
    { frag: 'backend/srv/auth/list_apikey.ts.frag', out: 'backend/src/srv/auth/list_apikey.ts' },
    { frag: 'backend/srv/auth/revoke_apikey.ts.frag', out: 'backend/src/srv/auth/revoke_apikey.ts' },
    { frag: 'backend/srv/auth/web_create_apikey.ts.frag', out: 'backend/src/srv/auth/web_create_apikey.ts' },
    { frag: 'backend/srv/auth/web_list_apikey.ts.frag', out: 'backend/src/srv/auth/web_list_apikey.ts' },
    { frag: 'backend/srv/auth/web_revoke_apikey.ts.frag', out: 'backend/src/srv/auth/web_revoke_apikey.ts' },
    // The strict-JSON REST API (model main.api): api service + HTTP mapping.
    // valid_gen.ts (request validation shapes) is REGENERATED by api_gen.
    { frag: 'backend/srv/api/api-srv.ts.frag', out: 'backend/src/srv/api/api-srv.ts' },
    { frag: 'backend/srv/api/get_info.ts.frag', out: 'backend/src/srv/api/get_info.ts' },
    { frag: 'backend/srv/api/on_ent.ts.frag', out: 'backend/src/srv/api/on_ent.ts' },
    { frag: 'backend/srv/api/expose.ts.frag', out: 'backend/src/srv/api/expose.ts' },
    { frag: 'backend/env/web/api.ts.frag', out: 'backend/src/env/web/api.ts' },
    // Unit tests for what EnvWeb generates (node:test). They are
    // MODEL-DRIVEN - the entity under test and its payloads come from the
    // model - so they hold for any entity graph, and they stand in for
    // other services with mock messages rather than booting them.
    { frag: 'backend/test/unit/srv/api/api.setup.ts.frag', out: 'backend/test/unit/srv/api/api.setup.ts' },
    { frag: 'backend/test/unit/srv/api/api.test.ts.frag', out: 'backend/test/unit/srv/api/api.test.ts' },
    { frag: 'backend/test/unit/srv/auth/auth.setup.ts.frag', out: 'backend/test/unit/srv/auth/auth.setup.ts' },
    { frag: 'backend/test/unit/srv/auth/apikey.test.ts.frag', out: 'backend/test/unit/srv/auth/apikey.test.ts' },
    { frag: 'backend/test/unit/srv/auth/session.test.ts.frag', out: 'backend/test/unit/srv/auth/session.test.ts' },
    { frag: 'backend/test/unit/env/web/api-router.test.ts.frag', out: 'backend/test/unit/env/web/api-router.test.ts' },
    { frag: 'backend/test/unit/env/web/surface.test.ts.frag', out: 'backend/test/unit/env/web/surface.test.ts' },
    { frag: 'backend/test/unit/srv/ent/ent.setup.ts.frag', out: 'backend/test/unit/srv/ent/ent.setup.ts' },
    { frag: 'backend/test/unit/srv/ent/proxy.test.ts.frag', out: 'backend/test/unit/srv/ent/proxy.test.ts' },
    // Generic entity service (parameterised CRUD, membership-scoped).
    { frag: 'backend/srv/ent/ent-srv.ts.frag', out: 'backend/src/srv/ent/ent-srv.ts' },
    { frag: 'backend/srv/ent/access.ts.frag', out: 'backend/src/srv/ent/access.ts' },
    { frag: 'backend/srv/ent/get_info.ts.frag', out: 'backend/src/srv/ent/get_info.ts' },
    { frag: 'backend/srv/ent/cmd_list.ts.frag', out: 'backend/src/srv/ent/cmd_list.ts' },
    { frag: 'backend/srv/ent/cmd_load.ts.frag', out: 'backend/src/srv/ent/cmd_load.ts' },
    { frag: 'backend/srv/ent/cmd_save.ts.frag', out: 'backend/src/srv/ent/cmd_save.ts' },
    { frag: 'backend/srv/ent/cmd_remove.ts.frag', out: 'backend/src/srv/ent/cmd_remove.ts' },
    // Browser proxies: aim:web,on:ent,cmd:* -> aim:ent,cmd:* (the gateway
    // accepts only aim:web, so the entity service is never posted directly
    // from a browser).
    { frag: 'backend/srv/ent/web_cmd_list.ts.frag', out: 'backend/src/srv/ent/web_cmd_list.ts' },
    { frag: 'backend/srv/ent/web_cmd_load.ts.frag', out: 'backend/src/srv/ent/web_cmd_load.ts' },
    { frag: 'backend/srv/ent/web_cmd_save.ts.frag', out: 'backend/src/srv/ent/web_cmd_save.ts' },
    { frag: 'backend/srv/ent/web_cmd_remove.ts.frag', out: 'backend/src/srv/ent/web_cmd_remove.ts' },
];
exports.WEB_FILES = WEB_FILES;
// Default seeded users (local testing only), rendered into the runner.
const DEFAULT_USERS = [
    { name: 'Alice Example', email: 'alice@example.com', password: 'alice-pass-01' },
    { name: 'Bob Example', email: 'bob@example.com', password: 'bob-pass-01' },
];
exports.DEFAULT_USERS = DEFAULT_USERS;
// The frontend folder name, from the model env entry (`web: { dir: ... }`).
// Defaults to 'web', so a project that says nothing keeps the layout it
// already has. Everything that names the folder - the WEB_FILES output
// paths, views.js, theme.css, and the static path the backend runner
// serves - goes through this one value, via the $$fe$$ slot.
//
// Only the FOLDER moves. The `aim:web` message namespace is unrelated and
// must never follow it: the gateway allow-list is the literal
// { 'aim:web': true }, and backend/src/env/web/ is the backend runner, not
// the SPA.
const DEFAULT_FE = 'web';
// Absent means 'web'. ANYTHING ELSE provided is validated rather than
// silently defaulted - `dir: ''` is a mistake, not a request for 'web', and
// defaulting it would generate the whole SPA into the project root.
function feDir(envdef) {
    const dir = null == envdef ? undefined : envdef.dir;
    if (null == dir) {
        return DEFAULT_FE;
    }
    if ('string' !== typeof dir || '' === dir || dir.split('/').includes('..') ||
        path_1.default.isAbsolute(dir)) {
        throw new Error('EnvWeb: env web `dir` must be a non-empty relative folder name, got: ' +
            JSON.stringify(dir));
    }
    return dir;
}
// web_gen(model, spec): generate the frontend + backend web pieces into
// the project. spec.root is the project root (parent of backend/); files
// that already exist are left untouched (create-once).
const web_gen = async (model, spec) => {
    const core = (0, conf_1.CoreConfShape)(model.main.conf.core);
    const envdef = spec.env || {};
    const fe = feDir(envdef);
    const users = envdef.users || DEFAULT_USERS;
    const seed = users[0] || DEFAULT_USERS[0];
    const port = envdef.port ||
        (model.main.conf.port && model.main.conf.port.backend) || 8080;
    const slots = {
        name: core.name,
        Name: (0, util_1.camelify)(core.name),
        fe,
        users: JSON.stringify(users, null, 2),
        e2eport: envdef.e2eport || (port + 10),
        seedEmail: seed.email,
        seedPassword: seed.password,
    };
    const created = [];
    const skipped = [];
    for (const fd of WEB_FILES) {
        const outrel = (0, generate_1.renderFragment)(fd.out, slots);
        const dest = path_1.default.join(spec.root, outrel);
        if (fs_1.default.existsSync(dest) && !spec.force) {
            skipped.push(outrel);
            continue;
        }
        const content = (0, generate_1.renderFragment)((0, generate_1.loadFragment)(fd.frag, spec, 'web'), slots);
        fs_1.default.mkdirSync(path_1.default.dirname(dest), { recursive: true });
        fs_1.default.writeFileSync(dest, content);
        created.push(outrel);
    }
    // Custom entity views: for every entity declaring `ux:{ view: 'custom' }`,
    // generate a hand-coded view component (CREATE-ONCE, so edits survive) plus
    // an always-regenerated index (views.js) that imports them.
    const entzones = model.main.ent || {};
    const customs = [];
    for (const zone of Object.keys(entzones)) {
        for (const name of Object.keys(entzones[zone])) {
            const def = entzones[zone][name];
            if (def && def.ux && 'custom' === def.ux.view) {
                customs.push({ zone, name, canon: zone + '/' + name });
            }
        }
    }
    for (const c of customs) {
        const vslots = Object.assign({}, slots, {
            canon: c.canon,
            zone: c.zone,
            name: c.name,
            tag: 'vg-view-' + c.zone + '-' + c.name,
            className: 'VgView' + (0, util_1.camelify)(c.zone) + (0, util_1.camelify)(c.name),
            Label: (0, util_1.camelify)(c.name),
        });
        // The component starter plus its doc sidecar, both create-once.
        for (const ext of ['js', 'md']) {
            const outrel = fe + '/src/cmp/view/' + c.zone + '_' + c.name + '.' + ext;
            const dest = path_1.default.join(spec.root, outrel);
            if (fs_1.default.existsSync(dest) && !spec.force) {
                skipped.push(outrel);
                continue;
            }
            const content = (0, generate_1.renderFragment)((0, generate_1.loadFragment)('web/src/cmp/view/custom-view.' + ext + '.frag', spec, 'web'), vslots);
            fs_1.default.mkdirSync(path_1.default.dirname(dest), { recursive: true });
            fs_1.default.writeFileSync(dest, content);
            created.push(outrel);
        }
    }
    // views.js — the generated index of custom views. Regenerated whenever the
    // set of custom views changes; a no-op run leaves it (and `created`) alone.
    const viewsRel = fe + '/src/views.js';
    const viewsPath = path_1.default.join(spec.root, viewsRel);
    const viewsBody = '// AUTO-GENERATED: imports every custom entity view (model entities declaring\n' +
        '// ux:{view:\'custom\'}). Regenerated from the model — do not edit. The view\n' +
        '// files it imports are hand-coded and create-once.\n\n' +
        customs.map((c) => `import './cmp/view/${c.zone}_${c.name}.js'`).join('\n') + '\n';
    const existingViews = fs_1.default.existsSync(viewsPath) ? fs_1.default.readFileSync(viewsPath, 'utf8') : null;
    if (existingViews !== viewsBody) {
        fs_1.default.mkdirSync(path_1.default.join(spec.root, fe, 'src'), { recursive: true });
        fs_1.default.writeFileSync(viewsPath, viewsBody);
        created.push(viewsRel);
    }
    // theme.css — the design theme from the model (main.theme). Each mode's
    // tokens become CSS variables under :root[data-theme-mode="<mode>"], with the
    // default mode also on plain :root. Regenerated from the model; override
    // tokens in custom.css and add modes via the theme:modes hook.
    const theme = model.main && model.main.theme;
    if (theme && theme.modes && Object.keys(theme.modes).length) {
        const defMode = theme.mode || Object.keys(theme.modes)[0];
        const tokensCss = (tokens) => Object.keys(tokens).sort()
            .map((k) => `  --vg-${k}: ${tokens[k]};`).join('\n');
        const blocks = [':root,\n:root[data-theme-mode="' + defMode + '"] {\n' + tokensCss(theme.modes[defMode]) + '\n}'];
        for (const mode of Object.keys(theme.modes)) {
            if (mode !== defMode) {
                blocks.push(':root[data-theme-mode="' + mode + '"] {\n' + tokensCss(theme.modes[mode]) + '\n}');
            }
        }
        const themeBody = '/* AUTO-GENERATED from the model theme (main.theme) — do not edit.\n' +
            '   Override tokens in custom.css; add modes via the theme:modes hook. */\n\n' +
            blocks.join('\n\n') + '\n';
        const themePath = path_1.default.join(spec.root, fe, 'src/theme.css');
        const existingTheme = fs_1.default.existsSync(themePath) ? fs_1.default.readFileSync(themePath, 'utf8') : null;
        if (existingTheme !== themeBody) {
            fs_1.default.mkdirSync(path_1.default.join(spec.root, fe, 'src'), { recursive: true });
            fs_1.default.writeFileSync(themePath, themeBody);
            created.push(fe + '/src/theme.css');
        }
    }
    return { created: created.sort(), skipped: skipped.sort() };
};
exports.web_gen = web_gen;
//# sourceMappingURL=web_gen.js.map