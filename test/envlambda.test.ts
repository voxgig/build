/* Copyright © 2026 Voxgig Ltd, MIT License */

// Byte-identity fixtures for the jostraca-based EnvLambda templates.
//
// test/fixture holds the exact output of the pre-jostraca (3.1.0) generator
// for test/richmodel.js — a model exercising every branch (sqs/s3/schedule
// events, cors props, httpApi v2, gen.custom override, custom kind skip,
// queue defs, dynamo tables, ts and js handler langs). The refactor must
// reproduce it byte for byte.

import { describe, test } from 'node:test'
import assert from 'node:assert'

import Fs from 'fs'
import Os from 'os'
import Path from 'path'

import { EnvLambda } from '../build'

const model = require('./richmodel.js')


function read(p: string) {
  return Fs.readFileSync(p, 'utf8')
}

function fixture(rel: string) {
  return read(Path.join(__dirname, 'fixture', rel))
}


describe('envlambda-jostraca', () => {

  test('byte-identical-to-3.1.0', async () => {
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-envlambda-'))
    const genTs = Path.join(out, 'rich-ts', 'gen')
    const handlerTs = Path.join(out, 'rich-ts', 'handler')
    const handlerJs = Path.join(out, 'rich-js', 'handler')

    await EnvLambda.srv_yml(model, { folder: genTs })
    await EnvLambda.srv_handler(model, {
      folder: handlerTs, start: 'lambda',
      env: { folder: '../../env/lambda' }, lang: 'ts',
    })
    await EnvLambda.srv_handler(model, {
      folder: handlerJs, start: 'lambda',
      env: { folder: '../../env/lambda' }, lang: 'js',
    })
    await EnvLambda.resources_yml(model, {
      folder: genTs, filename: 'res.yml', custom: null as any,
    })

    assert.deepEqual(read(Path.join(genTs, 'srv.yml')), fixture('rich-ts/srv.yml'))
    assert.deepEqual(read(Path.join(genTs, 'res.yml')), fixture('rich-ts/res.yml'))

    for (const name of ['alpha', 'beta', 'delta', 'gamma']) {
      assert.deepEqual(read(Path.join(handlerTs, name + '.ts')), fixture('rich-ts/' + name + '.ts.txt'))
      assert.deepEqual(read(Path.join(handlerJs, name + '.js')), fixture('rich-js/' + name + '.js.txt'))
    }

    // customkind (kind=custom) and nolambda (no env.lambda) are skipped.
    assert.deepEqual(Fs.existsSync(Path.join(handlerTs, 'customkind.ts')), false)
    assert.deepEqual(Fs.existsSync(Path.join(handlerTs, 'nolambda.ts')), false)
  })

})


describe('fragment-shadowing', () => {

  test('project-tm-overrides-package-fragment', async () => {
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-shadow-'))
    const tm = Path.join(out, 'tm')
    Fs.mkdirSync(tm, { recursive: true })

    // Shadow the service fragment with a custom shape.
    Fs.writeFileSync(Path.join(tm, 'srv.yml.frag'),
      '# custom $$name$$ (memory $$memory$$)\n$$events$$\n')

    const gen = Path.join(out, 'gen')
    await EnvLambda.srv_yml(model, { folder: gen, tm } as any)

    const srv = Fs.readFileSync(Path.join(gen, 'srv.yml'), 'utf8')
    assert.ok((srv).includes('# custom alpha (memory 2048)'))
    assert.ok(!(srv).includes('handler:'))

    // Un-shadowed fragments still come from the package.
    const gen2 = Path.join(out, 'gen2')
    await EnvLambda.srv_yml(model, { folder: gen2 } as any)
    assert.ok((Fs.readFileSync(Path.join(gen2, 'srv.yml'), 'utf8')).includes('handler: dist/handler/lambda/alpha.handler'))
  })


  test('fragment-listing', () => {
    const { Fragments } = require('../build')
    const names = Fragments.list()
    assert.ok((names).includes('srv.yml.frag'))
    assert.ok((names).includes('srv_handler.ts.frag'))
    assert.ok((names).includes('res.role.yml.frag'))
    assert.ok((names).includes('res.queue.yml.frag'))
  })

})


describe('env-gen', () => {

  const envmodel = {
    main: {
      conf: { core: { name: 'acme' }, port: { backend: 50510 } },
      env: {
        local: { active: true },
        basic: { active: true },
        docker: { active: true, node: '20' },
        vm: { active: true },
        aws: { active: true, region: 'eu-west-1', stage: 'stg' },
        azure: { active: true },
        cloudflare: { active: true },
        off: { active: false, kind: 'docker' },
      },
    },
  }

  test('generates-all-environments', async () => {
    const { EnvGen } = require('../build')
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-envgen-'))
    const gen = Path.join(out, 'gen', 'env')
    const src = Path.join(out, 'src', 'env')

    await EnvGen.env_gen(envmodel, { folder: gen, src })

    // deployment artifacts per env
    assert.ok((Fs.readFileSync(Path.join(gen, 'local', 'run.sh'), 'utf8')).includes('npm run local'))
    assert.deepEqual(Fs.existsSync(Path.join(gen, 'basic', 'acme-backend.service')), true)
    assert.ok((Fs.readFileSync(Path.join(gen, 'docker', 'Dockerfile'), 'utf8')).includes('FROM node:20-slim'))
    assert.deepEqual(Fs.existsSync(Path.join(gen, 'vm', 'cloud-init.yaml')), true)
    const sls = Fs.readFileSync(Path.join(gen, 'aws', 'serverless.yml'), 'utf8')
    assert.ok((sls).includes('service: acme-backend'))
    assert.ok((sls).includes('region: eu-west-1'))
    assert.ok((sls).includes("stage: ${opt:stage, 'stg'}"))
    assert.ok((sls).includes('functions: ${file(./srv.yml)}'))
    assert.deepEqual(Fs.existsSync(Path.join(gen, 'azure', 'host.json')), true)
    assert.ok((Fs.readFileSync(Path.join(gen, 'cloudflare', 'wrangler.toml'),
      'utf8')).includes('name = "acme-backend"'))

    // disabled env not generated
    assert.deepEqual(Fs.existsSync(Path.join(gen, 'off')), false)

    // runtime entries (create-once)
    const basicEntry = Path.join(src, 'basic', 'basic.ts')
    assert.ok((Fs.readFileSync(basicEntry, 'utf8')).includes("env: 'basic'"))
    assert.deepEqual(Fs.existsSync(Path.join(src, 'lambda', 'lambda.ts')), true)
    assert.deepEqual(Fs.existsSync(Path.join(src, 'cloudflare', 'worker.ts')), true)

    // create-once: user edit survives regeneration
    Fs.writeFileSync(basicEntry, '// user owned\n')
    await EnvGen.env_gen(envmodel, { folder: gen, src })
    assert.deepEqual(Fs.readFileSync(basicEntry, 'utf8'), '// user owned\n')
  })


  test('unknown-kind-fails-clearly', async () => {
    const { EnvGen } = require('../build')
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-envgen-'))
    const bad = { main: { conf: { core: { name: 'x' } },
      env: { weird: { active: true } } } }
    await assert.rejects(EnvGen.env_gen(bad, { folder: out }),
      { message: /unknown environment kind: weird/ })
  })


  test('project-tm-shadowing', async () => {
    const { EnvGen } = require('../build')
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-envgen-'))
    const tm = Path.join(out, 'tm')
    Fs.mkdirSync(Path.join(tm, 'aws'), { recursive: true })
    Fs.writeFileSync(Path.join(tm, 'aws', 'serverless.yml.frag'),
      'service: custom-$$name$$\n')

    const gen = Path.join(out, 'gen')
    await EnvGen.env_gen({ main: { conf: { core: { name: 'acme' } },
      env: { aws: { active: true } } } }, { folder: gen, tm })
    assert.ok((Fs.readFileSync(Path.join(gen, 'aws', 'serverless.yml'), 'utf8')).includes('service: custom-acme'))
  })

})


describe('env-web', () => {

  test('generates the SPA + backend web pieces (create-once)', async () => {
    const { EnvWeb } = require('../build')
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-web-'))

    const model = {
      main: {
        conf: { core: { name: 'shop' }, port: { backend: 50600 } },
        srv: { widget: {}, order: {} },
      },
    }

    const res = await EnvWeb.web_gen(model, { root: out, env: {} })

    // key files present
    for (const f of [
      'web/package.json', 'web/index.html', 'web/playwright.config.js',
      'web/src/bus.js', 'web/src/cmp/admin.js', 'web/e2e/smoke.spec.js',
      'backend/src/env/web/web.ts', 'backend/src/srv/auth/auth-srv.ts',
    ]) {
      assert.deepEqual(Fs.existsSync(Path.join(out, f)), true)
    }

    // slots rendered
    const pkg = JSON.parse(
      Fs.readFileSync(Path.join(out, 'web/package.json'), 'utf8'))
    assert.deepEqual(pkg.name, 'shop-web')
    assert.notStrictEqual(pkg.devDependencies['seneca-browser'], undefined)

    const runner = Fs.readFileSync(
      Path.join(out, 'backend/src/env/web/web.ts'), 'utf8')
    assert.ok((runner).includes("name: 'shop-auth'"))
    assert.ok((runner).includes('alice@example.com'))
    // THE BROWSER SURFACE: only aim:web is reachable from a browser, and
    // it is a literal so it can be reviewed. It must never be widened to
    // the service namespaces (a browser reaching aim:auth or aim:ent
    // directly bypasses the declared proxies).
    assert.ok((runner).includes("allow: { 'aim:web': true }"))
    assert.ok(!(runner).includes('Object.keys((Model as any).main.srv)'))

    const html = Fs.readFileSync(Path.join(out, 'web/index.html'), 'utf8')
    assert.ok((html).includes('<title>Shop</title>'))

    const e2e = Fs.readFileSync(Path.join(out, 'web/e2e/smoke.spec.js'), 'utf8')
    assert.ok((e2e).includes("'alice@example.com'"))

    // create-once: an existing file is not overwritten
    Fs.writeFileSync(Path.join(out, 'web/src/bus.js'), '// mine\n')
    const res2 = await EnvWeb.web_gen(model, { root: out, env: {} })
    assert.deepEqual(res2.created, [])
    assert.deepEqual(Fs.readFileSync(Path.join(out, 'web/src/bus.js'), 'utf8'), '// mine\n')
    assert.ok(((res.created.length) > (15)))
  })


  test('env_gen delegates kind:web', async () => {
    const { EnvGen } = require('../build')
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-web-'))
    await EnvGen.env_gen({
      main: { conf: { core: { name: 'shop' } }, srv: {},
        env: { web: { active: true } } },
    }, { folder: Path.join(out, 'gen'), root: out })
    assert.deepEqual(Fs.existsSync(Path.join(out, 'web/index.html')), true)
  })

})
