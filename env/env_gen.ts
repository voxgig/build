/* Copyright © 2026 Voxgig Ltd, MIT License. */

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

import Fs from 'fs'
import Path from 'path'

import { camelify } from '@voxgig/util'

import { CoreConfShape } from '../shape/conf'

import { generate, loadFragment, renderFragment } from './lambda/generate'


// The supported environment kinds and the files each generates.
// `out` may contain $$slots$$ (rendered with the same slot values).
const ENV_FILES: Record<string, { frag: string, out: string }[]> = {
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
}

// The runtime entry point + Seneca config setup each environment needs
// under src/env/. These are generated ONCE (only when missing): after
// creation the project owns them, like the scaffold's local entry. All
// entries route Seneca configuration through src/env/shared/basic.ts.
// `dir` is relative to the project src/env folder.
const ENV_SRC: Record<string, { frag: string, dir: string, out: string }[]> = {
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
}

const KINDS = Object.keys(ENV_FILES)


const env_gen = async (model: any, spec: {
  folder: string     // gen/env output root; each env writes <folder>/<name>/
  tm?: string        // project tm/env folder (fragment shadowing)
  src?: string       // project src/env folder: runtime entries generated
                     // here ONCE (existing files are never overwritten)
}) => {

  const core = CoreConfShape(model.main.conf.core)
  const envs = model.main.env || {}

  for (const entry of Object.entries(envs)) {
    const name = entry[0]
    const def: any = entry[1] || {}

    if (false === def.active) {
      continue
    }

    const kind = def.kind || name
    const filedefs = ENV_FILES[kind]
    if (null == filedefs) {
      throw new Error('@voxgig/build: unknown environment kind: ' + kind +
        ' (env ' + name + '; known kinds: ' + KINDS.join(', ') + ')')
    }

    // Slot values: project identity, ports, and per-env config with
    // sensible defaults. Additional scalar config keys on the env
    // definition become slots too.
    const slots: Record<string, any> = {
      name: core.name,
      Name: camelify(core.name),
      env: name,
      port: model.main.conf.port?.backend || 8080,
      node: def.node || '22',
      region: def.region || 'us-east-1',
      stage: def.stage || 'dev',
    }
    for (const key of Object.keys(def)) {
      if ('object' !== typeof def[key] && null == slots[key]) {
        slots[key] = def[key]
      }
    }

    // Slot for the env name inside entry fragments.
    slots.env = name

    const files = filedefs.map((fd) => ({
      name: renderFragment(fd.out, slots),
      content: renderFragment(loadFragment(fd.frag, spec, 'env'), slots),
    }))

    await generate(spec.folder + '/' + name, files)

    // Runtime entries: create-once into src/env (user-owned afterwards).
    if (null != spec.src) {
      for (const sd of (ENV_SRC[kind] || [])) {
        const dest = Path.join(spec.src, sd.dir, renderFragment(sd.out, slots))
        if (!Fs.existsSync(dest)) {
          const content =
            renderFragment(loadFragment(sd.frag, spec, 'env'), slots)
          Fs.mkdirSync(Path.dirname(dest), { recursive: true })
          Fs.writeFileSync(dest, content)
        }
      }
    }
  }
}


export {
  env_gen,
  ENV_FILES,
  ENV_SRC,
  KINDS,
}
