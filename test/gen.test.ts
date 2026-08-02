/* Copyright © 2026 Voxgig Ltd, MIT License */

// Coverage for the model-driven generators: doc_gen (mermaid docs +
// per-service READMEs), api_gen (OpenAPI + validation shapes), and the
// web_gen branches beyond the plain manifest (custom views, views.js,
// theme.css).

import { describe, test } from 'node:test'
import assert from 'node:assert'

import Fs from 'fs'
import Os from 'os'
import Path from 'path'

import { Docs, Api, EnvWeb } from '../build'


// A compact model exercising the generator branches: two zones with a
// ref relationship, a custom-view entity, a hidden entity, services with
// own + gateway messages and deps, active envs, a theme, and an api.
function makeModel(): any {
  return {
    main: {
      conf: { core: { name: 'demo', short: 'demo', token: 'demo-auth' } },
      ent: {
        shop: {
          product: {
            field: {
              id: { label: 'ID', kind: 'String' },
              title: { label: 'Title', kind: 'String', valid: 'Min(1).Max(99)' },
              price: { label: 'Price', kind: 'Number', valid: 'Skip' },
              live: { label: 'Live', kind: 'Boolean', valid: 'Skip' },
              owner_id: { label: 'Owner', kind: 'String' },
              t_c: { kind: 'Number', valid: 'Skip' },
            },
            ux: { view: 'custom' },
          },
          order: {
            field: {
              id: { kind: 'String' },
              product_id: { label: 'Product', kind: 'String', ref: 'shop/product', valid: 'Skip' },
              note: { kind: 'Weird', valid: 'Skip' },
            },
          },
        },
        sys: {
          apikey: { ux: { hide: true }, field: { id: { kind: 'String' } } },
        },
      },
      srv: {
        thing: {
          in: {
            aim: {
              thing: {},
              req: { on: { thing: { $: { allow: true } } } },
            },
          },
          user: { required: true },
          deps: { other: {} },
        },
        other: { in: { aim: { other: {} } } },
      },
      msg: {
        aim: {
          thing: {
            get: { info: {} },
            save: { item: {} },
          },
          other: { get: { info: {} } },
          req: {
            on: {
              thing: {
                save: { item: { $: { file: './web_save_item' } } },
              },
            },
          },
        },
      },
      env: {
        local: { active: true },
        web: { active: true },
        docker: { active: false },
      },
      theme: {
        mode: 'light',
        modes: {
          light: { primary: '#111111', bg: '#ffffff' },
          dark: { primary: '#eeeeee', bg: '#000000' },
        },
      },
      api: {
        active: true,
        prefix: '/api',
        version: 'v1',
        ent: { 'shop/order': { active: false } },
      },
    },
  }
}

function tmpProject(withSrv: string[] = []): string {
  const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'build-gen-'))
  for (const s of withSrv) {
    Fs.mkdirSync(Path.join(root, 'backend', 'src', 'srv', s), { recursive: true })
  }
  return root
}

const read = (root: string, rel: string) =>
  Fs.readFileSync(Path.join(root, rel), 'utf8')


describe('doc_gen', () => {

  test('generates diagram docs and per-service READMEs', async () => {
    const model = makeModel()
    const root = tmpProject(['thing'])

    const res = await Docs.doc_gen(model, { root })
    assert.deepEqual(res.created, [
      'backend/src/srv/thing/README.md',
      'docs/reference/entities.md',
      'docs/reference/messages.md',
      'docs/reference/system-map.md',
    ])

    const ents = read(root, 'docs/reference/entities.md')
    assert.ok((ents).includes('erDiagram'))
    assert.ok((ents).includes('shop_product ||--o{ shop_order : "product_id"'))
    assert.ok((ents).includes('| `shop/product` |'))
    assert.ok((ents).includes('custom view'))
    assert.ok((ents).includes('product_id FK'))

    const msgs = read(root, 'docs/reference/messages.md')
    assert.ok((msgs).includes('flowchart LR'))
    assert.ok((msgs).includes('`aim:thing,save:item` | `src/srv/thing/save_item.ts`'))
    assert.ok((msgs).includes('web_save_item'))

    const map = read(root, 'docs/reference/system-map.md')
    assert.ok((map).includes('subgraph spa[Web SPA]'))
    assert.ok((map).includes('view_shop_product'))
    assert.ok((map).includes('srv_thing -.depends.-> srv_other'))
    assert.ok((map).includes('env_local'))
    assert.ok(!(map).includes('env_docker'))

    const readme = read(root, 'backend/src/srv/thing/README.md')
    assert.ok((readme).includes('# Service: thing (generated)'))
    assert.ok((readme).includes('Requires a signed-in user'))
    assert.ok((readme).includes('save_item'))
    assert.ok((readme).includes('```mermaid'))

    // Content-diff: an unchanged model regenerates nothing.
    const again = await Docs.doc_gen(model, { root })
    assert.deepEqual(again.created, [])

    // Services without a folder get no README (only 'thing' exists).
    assert.strictEqual(Fs.existsSync(
      Path.join(root, 'backend/src/srv/other/README.md')), false)
  })

  test('system map without web env uses plain client node', async () => {
    const model = makeModel()
    model.main.env.web.active = false
    delete model.main.srv.thing.deps
    const root = tmpProject()
    await Docs.doc_gen(model, { root })
    const map = read(root, 'docs/reference/system-map.md')
    assert.ok((map).includes('client([Clients])'))
    assert.ok(!(map).includes('subgraph spa'))
  })
})


describe('api_gen', () => {

  test('generates openapi.json and valid_gen.ts', async () => {
    const model = makeModel()
    const root = tmpProject(['api'])

    const res = await Api.api_gen(model, { root })
    assert.deepEqual(res.created, [
      'backend/gen/api/openapi.json',
      'backend/gen/api/openapi.yaml',
      'backend/src/srv/api/valid_gen.ts',
    ])

    const spec = JSON.parse(read(root, 'backend/gen/api/openapi.json'))
    assert.strictEqual(spec.openapi, '3.1.0')
    assert.strictEqual(spec.info.title, 'demo API')
    assert.deepEqual(spec.servers, [{ url: '/api' }])
    // shop/order is deactivated, sys never exposed.
    assert.deepEqual(Object.keys(spec.paths), ['/v1/shop/product', '/v1/shop/product/{id}'])
    const schema = spec.components.schemas.ShopProduct
    assert.deepEqual(schema.required, ['title'])
    assert.strictEqual(schema.properties.id.readOnly, true)
    assert.strictEqual(schema.properties.title.type, 'string')
    assert.strictEqual(schema.properties.price.type, 'number')
    assert.strictEqual(schema.properties.live.type, 'boolean')
    assert.strictEqual(schema.additionalProperties, false)
    assert.strictEqual(spec.paths['/v1/shop/product'].get.operationId, 'list_shop_product')
    assert.notStrictEqual(spec.paths['/v1/shop/product'].post.responses['201'], undefined)
    assert.notStrictEqual(spec.paths['/v1/shop/product/{id}'].delete, undefined)
    assert.strictEqual(spec.components.securitySchemes.bearerAuth.scheme, 'bearer')

    // The YAML is the same document, and must parse back to it - byte
    // equality is not the point, structural equality is.
    const Yaml = require('js-yaml')
    const yamlText = read(root, 'backend/gen/api/openapi.yaml')
    const fromYaml = Yaml.load(yamlText)
    assert.deepEqual(fromYaml, spec)
    // noRefs: no YAML anchors/aliases, which codegen tools choke on.
    assert.ok(!/[&*]ref_\d/.test(yamlText), 'yaml must not contain anchors/aliases')

    const valid = read(root, 'backend/src/srv/api/valid_gen.ts')
    assert.ok((valid).includes('AUTO-GENERATED'))
    assert.ok((valid).includes("shapes['shop/product']"))
    assert.ok(!(valid).includes("shapes['shop/order']"))
    assert.ok((valid).includes('title: String,'))
    assert.ok((valid).includes('price: Skip(Number),'))
    // update shape: everything optional.
    assert.ok((valid).includes('title: Skip(String),'))
    // Server-managed fields excluded from the shapes (the header comment
    // names them, so check the shape-entry form).
    assert.ok(!(valid).includes('owner_id:'))

    // Content-diff no-op.
    const again = await Api.api_gen(model, { root })
    assert.deepEqual(again.created, [])
  })

  test('no main.api is a no-op; missing srv/api skips valid_gen', async () => {
    const model = makeModel()
    delete model.main.api
    const root = tmpProject()
    assert.deepEqual((await Api.api_gen(model, { root })).created, [])

    const model2 = makeModel()
    const root2 = tmpProject()  // no backend/src/srv/api folder
    const res2 = await Api.api_gen(model2, { root: root2 })
    assert.deepEqual(res2.created, [
      'backend/gen/api/openapi.json',
      'backend/gen/api/openapi.yaml',
    ])
  })
})


describe('web_gen model-driven outputs', () => {

  test('custom views, views.js, theme.css', async () => {
    const model = makeModel()
    const root = tmpProject()

    const res = await EnvWeb.web_gen(model, { root })

    // Custom view starter + doc sidecar, generated index, theme css.
    assert.ok((res.created).includes('web/src/cmp/view/shop_product.js'))
    assert.ok((res.created).includes('web/src/cmp/view/shop_product.md'))
    assert.ok((res.created).includes('web/src/views.js'))
    assert.ok((res.created).includes('web/src/theme.css'))

    const view = read(root, 'web/src/cmp/view/shop_product.js')
    assert.ok((view).includes('vg-view-shop-product'))
    const views = read(root, 'web/src/views.js')
    assert.ok((views).includes("import './cmp/view/shop_product.js'"))

    const theme = read(root, 'web/src/theme.css')
    assert.ok((theme).includes(':root[data-theme-mode="light"]'))
    assert.ok((theme).includes(':root[data-theme-mode="dark"]'))
    assert.ok((theme).includes('--vg-primary: #111111;'))

    // Create-once: a second run creates nothing and skips everything.
    const again = await EnvWeb.web_gen(model, { root })
    assert.deepEqual(again.created, [])
    assert.ok((again.skipped).includes('web/src/cmp/view/shop_product.js'))

    // Hand edits to create-once files survive; views.js/theme.css follow
    // the model: dropping the custom view + theme removes/regenerates.
    const model2 = makeModel()
    delete model2.main.ent.shop.product.ux
    model2.main.theme.modes = { light: { primary: '#222222' } }
    const res2 = await EnvWeb.web_gen(model2, { root })
    assert.ok((res2.created).includes('web/src/views.js'))
    assert.ok((res2.created).includes('web/src/theme.css'))
    assert.ok(!(read(root, 'web/src/views.js')).includes('shop_product'))
    assert.ok(!(read(root, 'web/src/theme.css')).includes('dark'))

    // force regenerates existing files.
    const res3 = await EnvWeb.web_gen(model2, { root, force: true })
    assert.ok((res3.created).includes('web/src/main.js'))
  })

  test('theme absent generates no theme.css', async () => {
    const model = makeModel()
    delete model.main.theme
    delete model.main.ent.shop.product.ux
    const root = tmpProject()
    const res = await EnvWeb.web_gen(model, { root })
    assert.ok(!(res.created).includes('web/src/theme.css'))
    assert.strictEqual(Fs.existsSync(Path.join(root, 'web/src/theme.css')), false)
  })
})
