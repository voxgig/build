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
  // Frontend SPA (web/)
  { frag: 'web/package.json.frag', out: 'web/package.json' },
  { frag: 'web/index.html.frag', out: 'web/index.html' },
  { frag: 'web/playwright.config.js.frag', out: 'web/playwright.config.js' },
  { frag: 'web/src/main.js.frag', out: 'web/src/main.js' },
  { frag: 'web/src/bus.js.frag', out: 'web/src/bus.js' },
  { frag: 'web/src/style.css.frag', out: 'web/src/style.css' },
  { frag: 'web/src/cmp/app.js.frag', out: 'web/src/cmp/app.js' },
  { frag: 'web/src/cmp/auth.js.frag', out: 'web/src/cmp/auth.js' },
  { frag: 'web/src/cmp/admin.js.frag', out: 'web/src/cmp/admin.js' },
  { frag: 'web/e2e/smoke.spec.js.frag', out: 'web/e2e/smoke.spec.js' },

  // Backend web runner + auth service (backend/src/...)
  { frag: 'backend/env/web/web.ts.frag', out: 'backend/src/env/web/web.ts' },
  { frag: 'backend/srv/auth/auth-srv.ts.frag', out: 'backend/src/srv/auth/auth-srv.ts' },
  { frag: 'backend/srv/auth/get_info.ts.frag', out: 'backend/src/srv/auth/get_info.ts' },
  { frag: 'backend/srv/auth/signin_user.ts.frag', out: 'backend/src/srv/auth/signin_user.ts' },
  { frag: 'backend/srv/auth/signout_user.ts.frag', out: 'backend/src/srv/auth/signout_user.ts' },
  { frag: 'backend/srv/auth/load_auth.ts.frag', out: 'backend/src/srv/auth/load_auth.ts' },
  { frag: 'backend/srv/auth/web_signin_user.ts.frag', out: 'backend/src/srv/auth/web_signin_user.ts' },
  { frag: 'backend/srv/auth/web_signout_user.ts.frag', out: 'backend/src/srv/auth/web_signout_user.ts' },
  { frag: 'backend/srv/auth/web_load_auth.ts.frag', out: 'backend/src/srv/auth/web_load_auth.ts' },
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

  return { created: created.sort(), skipped: skipped.sort() }
}


export {
  web_gen,
  WEB_FILES,
  DEFAULT_USERS,
}
