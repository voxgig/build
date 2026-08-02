/* Copyright © 2026 Voxgig Ltd, MIT License. */

// Docs: model-driven documentation generation - mermaid diagrams and
// per-service READMEs derived from the compiled model. Everything here is
// a pure function of the model, so (like theme.css and views.js) the
// output is REGENERATED on every model-build, content-diffed to avoid
// needless writes, and marked AUTO-GENERATED (never hand-edit).
//
// Outputs (paths relative to the project root):
//   docs/reference/entities.md    entity tables + ER diagram (ref fields)
//   docs/reference/messages.md    per-service message tables + flow diagram
//   docs/reference/system-map.md  system architecture + dependency map
//   backend/src/srv/<srv>/README.md   one per implemented service

import Fs from 'fs'
import Path from 'path'


type DocSpec = {
  root: string        // project root (holds backend/ and docs/)
  srvfolder?: string  // service source folder (default backend/src/srv)
}

const GENMARK = (what: string) =>
  `<!-- AUTO-GENERATED from the model by @voxgig/build (${what}) - do not edit. -->`


// Sanitize a canon or name into a mermaid-safe node id.
const mid = (s: string) => String(s).replace(/[^A-Za-z0-9_]/g, '_')


// ---- model walkers ----

// Leaf message patterns under a msg subtree. A leaf is a node with no
// child objects other than the '$' metadata entry. Returns
// [{ path: ['save','item'], meta: {file?} }].
function msgLeaves(node: any, prefix: string[] = []): { path: string[], meta: any }[] {
  const out: { path: string[], meta: any }[] = []
  const keys = Object.keys(node || {}).filter((k) => '$' !== k)
  if (0 === keys.length && 0 < prefix.length) {
    return [{ path: prefix, meta: (node && node.$) || {} }]
  }
  for (const k of keys) {
    if (node[k] && 'object' === typeof node[k]) {
      out.push(...msgLeaves(node[k], [...prefix, k]))
    }
    else if (0 < prefix.length) {
      // Scalar child: treat the current node as a leaf with options.
      return [{ path: prefix, meta: (node && node.$) || {} }]
    }
  }
  return out
}

// Pattern string for a leaf under aim:<srv>: 'aim:todo,save:item'.
const patstr = (aim: string, path: string[]) => {
  let s = 'aim:' + aim
  for (let i = 0; i < path.length; i += 2) {
    s += ',' + path[i] + ':' + (path[i + 1] || '')
  }
  return s
}

// Action file for a message by the MakeSrv convention: last pattern pair
// joined with '_' ('save','item' -> save_item), unless $.file overrides.
const actfile = (path: string[], meta: any) => {
  if (meta && meta.file) {
    return String(meta.file).replace(/^\.\//, '')
  }
  const last = path.slice(-2)
  return last.join('_')
}

// The services and their messages, from main.srv[].in + main.msg.aim.
function services(model: any) {
  const srvs = model.main.srv || {}
  const aim = (model.main.msg && model.main.msg.aim) || {}
  const out: any[] = []
  for (const name of Object.keys(srvs)) {
    const srv = srvs[name]
    const inaim = (srv.in && srv.in.aim) || {}
    const own: any[] = []
    const routes: any[] = []
    for (const k of Object.keys(inaim)) {
      if ('req' === k) {
        const on = (inaim.req && inaim.req.on) || {}
        for (const rk of Object.keys(on)) {
          for (const leaf of msgLeaves((aim.req && aim.req.on && aim.req.on[rk]) || {})) {
            routes.push({
              raw: leaf, on: rk,
              file: actfile(leaf.path, leaf.meta),
            })
          }
        }
      }
      else {
        for (const leaf of msgLeaves(aim[k] || {})) {
          own.push({
            pattern: patstr(k, leaf.path),
            file: actfile(leaf.path, leaf.meta),
          })
        }
      }
    }
    out.push({ name, srv, msgs: own, routes })
  }
  return out
}

// Entities with their fields and ref relationships.
function entities(model: any) {
  const zones = model.main.ent || {}
  const out: any[] = []
  for (const zone of Object.keys(zones)) {
    for (const name of Object.keys(zones[zone])) {
      const def = zones[zone][name] || {}
      const fields: any[] = []
      const refs: any[] = []
      for (const fname of Object.keys(def.field || {})) {
        const f = def.field[fname] || {}
        fields.push({ name: fname, kind: f.kind || 'String', ref: f.ref })
        if (f.ref) {
          refs.push({ field: fname, target: f.ref })
        }
      }
      out.push({
        zone, name, canon: zone + '/' + name, fields, refs,
        custom: !!(def.ux && 'custom' === def.ux.view),
      })
    }
  }
  return out
}


// ---- generators ----

function entitiesMd(model: any) {
  const ents = entities(model)
  const lines: string[] = []

  lines.push('# Reference: entities (generated)')
  lines.push('')
  lines.push(GENMARK('doc_gen'))
  lines.push('')
  lines.push('*Diátaxis: reference — the entity graph, derived from the model.*')
  lines.push('')
  lines.push('## Entity relationship diagram')
  lines.push('')
  lines.push('Relationships come from `ref` fields (the field stores the id of the')
  lines.push('target entity).')
  lines.push('')
  lines.push('```mermaid')
  lines.push('erDiagram')
  for (const e of ents) {
    lines.push('  ' + mid(e.canon) + ' {')
    for (const f of e.fields) {
      lines.push('    ' + mid(f.kind) + ' ' + mid(f.name) + (f.ref ? ' FK' : ''))
    }
    lines.push('  }')
  }
  for (const e of ents) {
    for (const r of e.refs) {
      lines.push('  ' + mid(r.target) + ' ||--o{ ' + mid(e.canon) + ' : "' + r.field + '"')
    }
  }
  lines.push('```')
  lines.push('')
  lines.push('(Entity ids are canons with `/` shown as `_`.)')
  lines.push('')
  lines.push('## Entities')
  lines.push('')
  lines.push('| Canon | Fields | Relationships | UI |')
  lines.push('|---|---|---|---|')
  for (const e of ents) {
    const flds = e.fields.map((f: any) => f.name).join(', ')
    const refs = e.refs.map((r: any) => `${r.field} → ${r.target}`).join('<br>') || '—'
    lines.push(`| \`${e.canon}\` | ${flds} | ${refs} | ${e.custom ? 'custom view' : 'generic admin'} |`)
  }
  lines.push('')
  return lines.join('\n')
}


function messagesMd(model: any) {
  const srvs = services(model)
  const lines: string[] = []

  lines.push('# Reference: messages (generated)')
  lines.push('')
  lines.push(GENMARK('doc_gen'))
  lines.push('')
  lines.push('*Diátaxis: reference — services and the messages they answer, derived')
  lines.push('from the model. Action files follow the MakeSrv convention (last')
  lines.push('pattern pair: `save:item` → `save_item`).*')
  lines.push('')
  lines.push('## Message flow')
  lines.push('')
  lines.push('```mermaid')
  lines.push('flowchart LR')
  lines.push('  client([Clients / SPA])')
  lines.push('  gateway{{gateway}}')
  lines.push('  client -->|aim:* messages| gateway')
  for (const s of srvs) {
    lines.push('  ' + mid(s.name) + '[srv ' + s.name + ']')
    const aims = Object.keys((s.srv.in && s.srv.in.aim) || {}).filter((k) => 'req' !== k)
    for (const a of aims) {
      lines.push('  gateway -->|aim:' + a + '| ' + mid(s.name))
    }
  }
  lines.push('```')
  lines.push('')

  for (const s of srvs) {
    lines.push('## Service: ' + s.name)
    lines.push('')
    lines.push('| Message | Action file |')
    lines.push('|---|---|')
    for (const m of s.msgs) {
      lines.push('| `' + m.pattern + '` | `src/srv/' + s.name + '/' + m.file + '.ts` |')
    }
    lines.push('')
    if (s.routes.length) {
      lines.push('Gateway (web) routes:')
      lines.push('')
      lines.push('| Route | Handler file |')
      lines.push('|---|---|')
      for (const r of s.routes) {
        lines.push('| `aim:req,on:' + r.on + ',' + patstr('', r.raw.path).slice(5) +
          '` | `src/srv/' + s.name + '/' + r.file + '.ts` |')
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}


function systemMapMd(model: any) {
  const srvs = services(model)
  const ents = entities(model)
  const envs = model.main.env || {}
  const active = Object.keys(envs).filter((k) => envs[k] && envs[k].active)
  const webactive = !!(envs.web && envs.web.active)
  const zones: Record<string, any[]> = {}
  for (const e of ents) {
    (zones[e.zone] = zones[e.zone] || []).push(e)
  }

  const lines: string[] = []
  lines.push('# Reference: system map (generated)')
  lines.push('')
  lines.push(GENMARK('doc_gen'))
  lines.push('')
  lines.push('*Diátaxis: reference — the system structure and its dependencies,')
  lines.push('derived from the model.*')
  lines.push('')
  lines.push('## Architecture')
  lines.push('')
  lines.push('```mermaid')
  lines.push('flowchart TB')
  if (webactive) {
    lines.push('  subgraph spa[Web SPA]')
    lines.push('    shell[cmp/shell]')
    lines.push('    admin[cmp/admin]')
    lines.push('    publiccmp[cmp/public + cmp/auth]')
    lines.push('    settings[cmp/settings]')
    for (const e of ents.filter((x) => x.custom)) {
      lines.push('    view_' + mid(e.canon) + '[cmp/view/' + e.zone + '_' + e.name + ']')
    }
    lines.push('    bus[(Seneca bus)]')
    lines.push('    shell --> bus')
    lines.push('    admin --> bus')
    lines.push('    publiccmp --> bus')
    lines.push('    settings --> bus')
    for (const e of ents.filter((x) => x.custom)) {
      lines.push('    view_' + mid(e.canon) + ' --> bus')
    }
    lines.push('  end')
    lines.push('  bus -->|aim:* over browser transport| gateway{{gateway}}')
  }
  else {
    lines.push('  client([Clients]) -->|aim:*| gateway{{gateway}}')
  }
  lines.push('  subgraph services[Services]')
  for (const s of srvs) {
    lines.push('    srv_' + mid(s.name) + '[' + s.name + ']')
  }
  lines.push('  end')
  for (const s of srvs) {
    lines.push('  gateway --> srv_' + mid(s.name))
  }
  // Service deps from the model (srv.deps), if declared.
  for (const s of srvs) {
    for (const d of Object.keys(s.srv.deps || {})) {
      lines.push('  srv_' + mid(s.name) + ' -.depends.-> srv_' + mid(d))
    }
  }
  lines.push('  subgraph data[Entities]')
  for (const zone of Object.keys(zones).sort()) {
    lines.push('    subgraph zone_' + mid(zone) + '[zone ' + zone + ']')
    for (const e of zones[zone]) {
      lines.push('      ' + mid(e.canon) + '[' + e.name + ']')
    }
    lines.push('    end')
  }
  lines.push('  end')
  for (const s of srvs) {
    lines.push('  srv_' + mid(s.name) + ' --> data')
  }
  lines.push('```')
  lines.push('')
  lines.push('## Target environments')
  lines.push('')
  lines.push('```mermaid')
  lines.push('flowchart LR')
  lines.push('  model[(model.json)]')
  for (const name of active) {
    lines.push('  model --> env_' + mid(name) + '[env ' + name + ']')
  }
  lines.push('```')
  lines.push('')
  lines.push('Active environments: ' + (active.map((a) => '`' + a + '`').join(', ') || 'none') + '.')
  lines.push('')
  lines.push('See also: [entities](entities.md) · [messages](messages.md).')
  lines.push('')
  return lines.join('\n')
}


function srvReadmeMd(model: any, s: any) {
  const lines: string[] = []
  lines.push('# Service: ' + s.name + ' (generated)')
  lines.push('')
  lines.push(GENMARK('doc_gen'))
  lines.push('')
  lines.push('Answers `aim:' +
    Object.keys((s.srv.in && s.srv.in.aim) || {}).filter((k) => 'req' !== k).join('`, `aim:') +
    '` messages, loaded by convention (`@voxgig/system` MakeSrv): each')
  lines.push('message maps to the action file named after its last pattern pair.')
  lines.push('')
  if (s.srv.user && s.srv.user.required) {
    lines.push('Requires a signed-in user (`user.required: true`).')
    lines.push('')
  }
  lines.push('## Messages')
  lines.push('')
  lines.push('| Message | Action file |')
  lines.push('|---|---|')
  for (const m of s.msgs) {
    lines.push('| `' + m.pattern + '` | `' + m.file + '.ts` |')
  }
  for (const r of s.routes) {
    lines.push('| `aim:req,on:' + r.on + ',' + patstr('', r.raw.path).slice(5) +
      '` (gateway) | `' + r.file + '.ts` |')
  }
  lines.push('')
  lines.push('## Flow')
  lines.push('')
  lines.push('```mermaid')
  lines.push('flowchart LR')
  lines.push('  gateway{{gateway}} -->|validated msg| srv[srv ' + s.name + ']')
  const seen = new Set<string>()
  for (const m of s.msgs) {
    if (!seen.has(m.file)) {
      seen.add(m.file)
      lines.push('  srv --> ' + mid(m.file) + '["' + m.pattern + '<br>' + m.file + '.ts"]')
    }
  }
  for (const r of s.routes) {
    const rid = mid(r.file)
    if (!seen.has(r.file)) {
      seen.add(r.file)
      lines.push('  gateway -.route.-> ' + rid + '["' + r.file + '.ts"]')
    }
  }
  lines.push('```')
  lines.push('')
  lines.push('Message params are validated from the model (gubu); see')
  lines.push('`../../../model/` and `docs/reference/messages.md` at the project root.')
  lines.push('')
  return lines.join('\n')
}


// Write content if changed; return true when written.
function writeIfChanged(dest: string, content: string): boolean {
  const existing = Fs.existsSync(dest) ? Fs.readFileSync(dest, 'utf8') : null
  if (existing === content) {
    return false
  }
  Fs.mkdirSync(Path.dirname(dest), { recursive: true })
  Fs.writeFileSync(dest, content)
  return true
}


// doc_gen(model, spec): generate the model-driven docs. Returns
// { created } - the (project-relative) paths actually (re)written.
const doc_gen = async (model: any, spec: DocSpec) => {
  const root = spec.root
  const srvfolder = spec.srvfolder || Path.join(root, 'backend', 'src', 'srv')
  const created: string[] = []

  const refdir = Path.join(root, 'docs', 'reference')
  if (writeIfChanged(Path.join(refdir, 'entities.md'), entitiesMd(model))) {
    created.push('docs/reference/entities.md')
  }
  if (writeIfChanged(Path.join(refdir, 'messages.md'), messagesMd(model))) {
    created.push('docs/reference/messages.md')
  }
  if (writeIfChanged(Path.join(refdir, 'system-map.md'), systemMapMd(model))) {
    created.push('docs/reference/system-map.md')
  }

  // Per-service READMEs - only for services whose folder exists (a
  // declared-but-unimplemented service has nowhere sensible to document).
  for (const s of services(model)) {
    const dir = Path.join(srvfolder, s.name)
    if (Fs.existsSync(dir)) {
      if (writeIfChanged(Path.join(dir, 'README.md'), srvReadmeMd(model, s))) {
        created.push('backend/src/srv/' + s.name + '/README.md')
      }
    }
  }

  return { created: created.sort() }
}


export {
  doc_gen,
}
