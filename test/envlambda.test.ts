/* Copyright © 2026 Voxgig Ltd, MIT License */

// Byte-identity fixtures for the jostraca-based EnvLambda templates.
//
// test/fixture holds the exact output of the pre-jostraca (3.1.0) generator
// for test/richmodel.js — a model exercising every branch (sqs/s3/schedule
// events, cors props, httpApi v2, gen.custom override, custom kind skip,
// queue defs, dynamo tables, ts and js handler langs). The refactor must
// reproduce it byte for byte.

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

    expect(read(Path.join(genTs, 'srv.yml'))).toEqual(fixture('rich-ts/srv.yml'))
    expect(read(Path.join(genTs, 'res.yml'))).toEqual(fixture('rich-ts/res.yml'))

    for (const name of ['alpha', 'beta', 'delta', 'gamma']) {
      expect(read(Path.join(handlerTs, name + '.ts')))
        .toEqual(fixture('rich-ts/' + name + '.ts.txt'))
      expect(read(Path.join(handlerJs, name + '.js')))
        .toEqual(fixture('rich-js/' + name + '.js.txt'))
    }

    // customkind (kind=custom) and nolambda (no env.lambda) are skipped.
    expect(Fs.existsSync(Path.join(handlerTs, 'customkind.ts'))).toEqual(false)
    expect(Fs.existsSync(Path.join(handlerTs, 'nolambda.ts'))).toEqual(false)
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
    expect(srv).toContain('# custom alpha (memory 2048)')
    expect(srv).not.toContain('handler:')

    // Un-shadowed fragments still come from the package.
    const gen2 = Path.join(out, 'gen2')
    await EnvLambda.srv_yml(model, { folder: gen2 } as any)
    expect(Fs.readFileSync(Path.join(gen2, 'srv.yml'), 'utf8'))
      .toContain('handler: dist/handler/lambda/alpha.handler')
  })


  test('fragment-listing', () => {
    const { Fragments } = require('../build')
    const names = Fragments.list()
    expect(names).toContain('srv.yml.frag')
    expect(names).toContain('srv_handler.ts.frag')
    expect(names).toContain('res.role.yml.frag')
    expect(names).toContain('res.queue.yml.frag')
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
    expect(Fs.readFileSync(Path.join(gen, 'local', 'run.sh'), 'utf8'))
      .toContain('npm run local')
    expect(Fs.existsSync(Path.join(gen, 'basic', 'acme-backend.service')))
      .toEqual(true)
    expect(Fs.readFileSync(Path.join(gen, 'docker', 'Dockerfile'), 'utf8'))
      .toContain('FROM node:20-slim')
    expect(Fs.existsSync(Path.join(gen, 'vm', 'cloud-init.yaml')))
      .toEqual(true)
    const sls = Fs.readFileSync(Path.join(gen, 'aws', 'serverless.yml'), 'utf8')
    expect(sls).toContain('service: acme-backend')
    expect(sls).toContain('region: eu-west-1')
    expect(sls).toContain("stage: ${opt:stage, 'stg'}")
    expect(sls).toContain('functions: ${file(./srv.yml)}')
    expect(Fs.existsSync(Path.join(gen, 'azure', 'host.json'))).toEqual(true)
    expect(Fs.readFileSync(Path.join(gen, 'cloudflare', 'wrangler.toml'),
      'utf8')).toContain('name = "acme-backend"')

    // disabled env not generated
    expect(Fs.existsSync(Path.join(gen, 'off'))).toEqual(false)

    // runtime entries (create-once)
    const basicEntry = Path.join(src, 'basic', 'basic.ts')
    expect(Fs.readFileSync(basicEntry, 'utf8')).toContain("env: 'basic'")
    expect(Fs.existsSync(Path.join(src, 'lambda', 'lambda.ts'))).toEqual(true)
    expect(Fs.existsSync(Path.join(src, 'cloudflare', 'worker.ts')))
      .toEqual(true)

    // create-once: user edit survives regeneration
    Fs.writeFileSync(basicEntry, '// user owned\n')
    await EnvGen.env_gen(envmodel, { folder: gen, src })
    expect(Fs.readFileSync(basicEntry, 'utf8')).toEqual('// user owned\n')
  })


  test('unknown-kind-fails-clearly', async () => {
    const { EnvGen } = require('../build')
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-envgen-'))
    const bad = { main: { conf: { core: { name: 'x' } },
      env: { weird: { active: true } } } }
    await expect(EnvGen.env_gen(bad, { folder: out }))
      .rejects.toThrow(/unknown environment kind: weird/)
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
    expect(Fs.readFileSync(Path.join(gen, 'aws', 'serverless.yml'), 'utf8'))
      .toContain('service: custom-acme')
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
      expect(Fs.existsSync(Path.join(out, f))).toEqual(true)
    }

    // slots rendered
    const pkg = JSON.parse(
      Fs.readFileSync(Path.join(out, 'web/package.json'), 'utf8'))
    expect(pkg.name).toEqual('shop-web')
    expect(pkg.devDependencies['seneca-browser']).toBeDefined()

    const runner = Fs.readFileSync(
      Path.join(out, 'backend/src/env/web/web.ts'), 'utf8')
    expect(runner).toContain("name: 'shop-auth'")
    expect(runner).toContain('alice@example.com')
    // generic allow derived from the model services
    expect(runner).toContain('Object.keys((Model as any).main.srv)')

    const html = Fs.readFileSync(Path.join(out, 'web/index.html'), 'utf8')
    expect(html).toContain('<title>Shop</title>')

    const e2e = Fs.readFileSync(Path.join(out, 'web/e2e/smoke.spec.js'), 'utf8')
    expect(e2e).toContain("'alice@example.com'")

    // create-once: an existing file is not overwritten
    Fs.writeFileSync(Path.join(out, 'web/src/bus.js'), '// mine\n')
    const res2 = await EnvWeb.web_gen(model, { root: out, env: {} })
    expect(res2.created).toEqual([])
    expect(Fs.readFileSync(Path.join(out, 'web/src/bus.js'), 'utf8'))
      .toEqual('// mine\n')
    expect(res.created.length).toBeGreaterThan(15)
  })


  test('env_gen delegates kind:web', async () => {
    const { EnvGen } = require('../build')
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-web-'))
    await EnvGen.env_gen({
      main: { conf: { core: { name: 'shop' } }, srv: {},
        env: { web: { active: true } } },
    }, { folder: Path.join(out, 'gen'), root: out })
    expect(Fs.existsSync(Path.join(out, 'web/index.html'))).toEqual(true)
  })

})
