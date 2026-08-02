/* Copyright © 2026 Voxgig Ltd, MIT License. */

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

import Fs from 'fs'
import Path from 'path'

import { camelify } from '@voxgig/util'

import { CoreConfShape } from '../../shape/conf'

import { loadFragment, renderFragment } from '../lambda/generate'


// File manifest: fragment (relative to tm/web) -> output path (relative to
// the project root, which holds backend/ and web/). $$slots$$ in the
// output path are rendered too.
const WEB_FILES: { frag: string, out: string }[] = [
  // Frontend SPA (web/) — a model-driven enterprise app: public site + login,
  // an app shell (nav / project selector / user menu / collapsible entity
  // menu), and generic CRUD with relationship navigation. All runtime
  // model-driven (model.js reads /model.json), so it fits any entity graph.
  { frag: 'web/package.json.frag', out: 'web/package.json' },
  { frag: 'web/index.html.frag', out: 'web/index.html' },
  { frag: 'web/playwright.config.js.frag', out: 'web/playwright.config.js' },
  { frag: 'web/src/main.js.frag', out: 'web/src/main.js' },
  { frag: 'web/src/bus.js.frag', out: 'web/src/bus.js' },
  { frag: 'web/src/model.js.frag', out: 'web/src/model.js' },
  { frag: 'web/src/api.js.frag', out: 'web/src/api.js' },
  { frag: 'web/src/hooks.js.frag', out: 'web/src/hooks.js' },
  { frag: 'web/src/theme.js.frag', out: 'web/src/theme.js' },
  { frag: 'web/src/customise.js.frag', out: 'web/src/customise.js' },
  { frag: 'web/src/custom.css.frag', out: 'web/src/custom.css' },
  { frag: 'web/src/style.css.frag', out: 'web/src/style.css' },
  { frag: 'web/src/cmp/app.js.frag', out: 'web/src/cmp/app.js' },
  { frag: 'web/src/cmp/public.js.frag', out: 'web/src/cmp/public.js' },
  { frag: 'web/src/cmp/auth.js.frag', out: 'web/src/cmp/auth.js' },
  { frag: 'web/src/cmp/shell.js.frag', out: 'web/src/cmp/shell.js' },
  { frag: 'web/src/cmp/admin.js.frag', out: 'web/src/cmp/admin.js' },
  { frag: 'web/src/cmp/settings.js.frag', out: 'web/src/cmp/settings.js' },

  // Per-component doc sidecars (mermaid structure + message diagrams),
  // create-once next to each component.
  { frag: 'web/src/cmp/app.md.frag', out: 'web/src/cmp/app.md' },
  { frag: 'web/src/cmp/public.md.frag', out: 'web/src/cmp/public.md' },
  { frag: 'web/src/cmp/auth.md.frag', out: 'web/src/cmp/auth.md' },
  { frag: 'web/src/cmp/shell.md.frag', out: 'web/src/cmp/shell.md' },
  { frag: 'web/src/cmp/admin.md.frag', out: 'web/src/cmp/admin.md' },
  { frag: 'web/src/cmp/settings.md.frag', out: 'web/src/cmp/settings.md' },
  { frag: 'web/e2e/smoke.spec.js.frag', out: 'web/e2e/smoke.spec.js' },
  { frag: 'web/AGENTS.md.frag', out: 'web/AGENTS.md' },

  // Project docs (Diátaxis) for the web app, alongside the scaffold's
  // backend docs (@voxgig/create-system DocsPart). Create-once like all
  // WEB_FILES: the project owns its docs after generation.
  { frag: 'docs/how-to/customise-the-web-app.md.frag', out: 'docs/how-to/customise-the-web-app.md' },
  { frag: 'docs/how-to/change-the-theme.md.frag', out: 'docs/how-to/change-the-theme.md' },
  { frag: 'docs/how-to/add-a-custom-entity-view.md.frag', out: 'docs/how-to/add-a-custom-entity-view.md' },
  { frag: 'docs/reference/web-app.md.frag', out: 'docs/reference/web-app.md' },
  { frag: 'docs/explanation/web-architecture.md.frag', out: 'docs/explanation/web-architecture.md' },

  // Backend web runner + auth service (backend/src/...)
  { frag: 'backend/env/web/web.ts.frag', out: 'backend/src/env/web/web.ts' },
  { frag: 'backend/env/shared/seed.ts.frag', out: 'backend/src/env/shared/seed.ts' },
  { frag: 'backend/srv/auth/auth-srv.ts.frag', out: 'backend/src/srv/auth/auth-srv.ts' },
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

  // Generic entity service (parameterised CRUD, membership-scoped).
  { frag: 'backend/srv/ent/ent-srv.ts.frag', out: 'backend/src/srv/ent/ent-srv.ts' },
  { frag: 'backend/srv/ent/access.ts.frag', out: 'backend/src/srv/ent/access.ts' },
  { frag: 'backend/srv/ent/get_info.ts.frag', out: 'backend/src/srv/ent/get_info.ts' },
  { frag: 'backend/srv/ent/cmd_list.ts.frag', out: 'backend/src/srv/ent/cmd_list.ts' },
  { frag: 'backend/srv/ent/cmd_load.ts.frag', out: 'backend/src/srv/ent/cmd_load.ts' },
  { frag: 'backend/srv/ent/cmd_save.ts.frag', out: 'backend/src/srv/ent/cmd_save.ts' },
  { frag: 'backend/srv/ent/cmd_remove.ts.frag', out: 'backend/src/srv/ent/cmd_remove.ts' },
]


// Default seeded users (local testing only), rendered into the runner.
const DEFAULT_USERS = [
  { name: 'Alice Example', email: 'alice@example.com', password: 'alice-pass-01' },
  { name: 'Bob Example', email: 'bob@example.com', password: 'bob-pass-01' },
]


// web_gen(model, spec): generate the frontend + backend web pieces into
// the project. spec.root is the project root (parent of backend/); files
// that already exist are left untouched (create-once).
const web_gen = async (model: any, spec: {
  root: string       // project root (holds backend/ and web/)
  tm?: string        // project tm/web folder (fragment shadowing)
  env?: any          // the model env entry (config: port, users)
  force?: boolean    // overwrite existing files (default: create-once)
}) => {

  const core = CoreConfShape(model.main.conf.core)
  const envdef = spec.env || {}

  const users = envdef.users || DEFAULT_USERS
  const seed = users[0] || DEFAULT_USERS[0]
  const port = envdef.port ||
    (model.main.conf.port && model.main.conf.port.backend) || 8080

  const slots: Record<string, any> = {
    name: core.name,
    Name: camelify(core.name),
    users: JSON.stringify(users, null, 2),
    e2eport: envdef.e2eport || (port + 10),
    seedEmail: seed.email,
    seedPassword: seed.password,
  }

  const created: string[] = []
  const skipped: string[] = []

  for (const fd of WEB_FILES) {
    const outrel = renderFragment(fd.out, slots)
    const dest = Path.join(spec.root, outrel)

    if (Fs.existsSync(dest) && !spec.force) {
      skipped.push(outrel)
      continue
    }

    const content = renderFragment(loadFragment(fd.frag, spec, 'web'), slots)
    Fs.mkdirSync(Path.dirname(dest), { recursive: true })
    Fs.writeFileSync(dest, content)
    created.push(outrel)
  }

  // Custom entity views: for every entity declaring `ux:{ view: 'custom' }`,
  // generate a hand-coded view component (CREATE-ONCE, so edits survive) plus
  // an always-regenerated index (views.js) that imports them.
  const entzones = model.main.ent || {}
  const customs: { zone: string, name: string, canon: string }[] = []
  for (const zone of Object.keys(entzones)) {
    for (const name of Object.keys(entzones[zone])) {
      const def = entzones[zone][name]
      if (def && def.ux && 'custom' === def.ux.view) {
        customs.push({ zone, name, canon: zone + '/' + name })
      }
    }
  }

  for (const c of customs) {
    const vslots = Object.assign({}, slots, {
      canon: c.canon,
      zone: c.zone,
      name: c.name,
      tag: 'vg-view-' + c.zone + '-' + c.name,
      className: 'VgView' + camelify(c.zone) + camelify(c.name),
      Label: camelify(c.name),
    })
    // The component starter plus its doc sidecar, both create-once.
    for (const ext of ['js', 'md']) {
      const outrel = 'web/src/cmp/view/' + c.zone + '_' + c.name + '.' + ext
      const dest = Path.join(spec.root, outrel)
      if (Fs.existsSync(dest) && !spec.force) {
        skipped.push(outrel)
        continue
      }
      const content = renderFragment(
        loadFragment('web/src/cmp/view/custom-view.' + ext + '.frag', spec, 'web'), vslots)
      Fs.mkdirSync(Path.dirname(dest), { recursive: true })
      Fs.writeFileSync(dest, content)
      created.push(outrel)
    }
  }

  // views.js — the generated index of custom views. Regenerated whenever the
  // set of custom views changes; a no-op run leaves it (and `created`) alone.
  const viewsRel = 'web/src/views.js'
  const viewsPath = Path.join(spec.root, viewsRel)
  const viewsBody =
    '// AUTO-GENERATED: imports every custom entity view (model entities declaring\n' +
    '// ux:{view:\'custom\'}). Regenerated from the model — do not edit. The view\n' +
    '// files it imports are hand-coded and create-once.\n\n' +
    customs.map((c) => `import './cmp/view/${c.zone}_${c.name}.js'`).join('\n') + '\n'
  const existingViews = Fs.existsSync(viewsPath) ? Fs.readFileSync(viewsPath, 'utf8') : null
  if (existingViews !== viewsBody) {
    Fs.mkdirSync(Path.join(spec.root, 'web/src'), { recursive: true })
    Fs.writeFileSync(viewsPath, viewsBody)
    created.push(viewsRel)
  }

  // theme.css — the design theme from the model (main.theme). Each mode's
  // tokens become CSS variables under :root[data-theme-mode="<mode>"], with the
  // default mode also on plain :root. Regenerated from the model; override
  // tokens in custom.css and add modes via the theme:modes hook.
  const theme = model.main && model.main.theme
  if (theme && theme.modes && Object.keys(theme.modes).length) {
    const defMode = theme.mode || Object.keys(theme.modes)[0]
    const tokensCss = (tokens: any) => Object.keys(tokens).sort()
      .map((k) => `  --vg-${k}: ${tokens[k]};`).join('\n')
    const blocks = [':root,\n:root[data-theme-mode="' + defMode + '"] {\n' + tokensCss(theme.modes[defMode]) + '\n}']
    for (const mode of Object.keys(theme.modes)) {
      if (mode !== defMode) {
        blocks.push(':root[data-theme-mode="' + mode + '"] {\n' + tokensCss(theme.modes[mode]) + '\n}')
      }
    }
    const themeBody =
      '/* AUTO-GENERATED from the model theme (main.theme) — do not edit.\n' +
      '   Override tokens in custom.css; add modes via the theme:modes hook. */\n\n' +
      blocks.join('\n\n') + '\n'
    const themePath = Path.join(spec.root, 'web/src/theme.css')
    const existingTheme = Fs.existsSync(themePath) ? Fs.readFileSync(themePath, 'utf8') : null
    if (existingTheme !== themeBody) {
      Fs.mkdirSync(Path.join(spec.root, 'web/src'), { recursive: true })
      Fs.writeFileSync(themePath, themeBody)
      created.push('web/src/theme.css')
    }
  }

  return { created: created.sort(), skipped: skipped.sort() }
}


export {
  web_gen,
  WEB_FILES,
  DEFAULT_USERS,
}
