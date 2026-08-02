/* Copyright © 2026 Voxgig Ltd, MIT License */

// Coverage for the model-driven generators: doc_gen (mermaid docs +
// per-service READMEs), api_gen (OpenAPI + validation shapes), and the
// web_gen branches beyond the plain manifest (custom views, views.js,
// theme.css).

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
    expect(res.created).toEqual([
      'backend/src/srv/thing/README.md',
      'docs/reference/entities.md',
      'docs/reference/messages.md',
      'docs/reference/system-map.md',
    ])

    const ents = read(root, 'docs/reference/entities.md')
    expect(ents).toContain('erDiagram')
    expect(ents).toContain('shop_product ||--o{ shop_order : "product_id"')
    expect(ents).toContain('| `shop/product` |')
    expect(ents).toContain('custom view')
    expect(ents).toContain('product_id FK')

    const msgs = read(root, 'docs/reference/messages.md')
    expect(msgs).toContain('flowchart LR')
    expect(msgs).toContain('`aim:thing,save:item` | `src/srv/thing/save_item.ts`')
    expect(msgs).toContain('web_save_item')

    const map = read(root, 'docs/reference/system-map.md')
    expect(map).toContain('subgraph spa[Web SPA]')
    expect(map).toContain('view_shop_product')
    expect(map).toContain('srv_thing -.depends.-> srv_other')
    expect(map).toContain('env_local')
    expect(map).not.toContain('env_docker')

    const readme = read(root, 'backend/src/srv/thing/README.md')
    expect(readme).toContain('# Service: thing (generated)')
    expect(readme).toContain('Requires a signed-in user')
    expect(readme).toContain('save_item')
    expect(readme).toContain('```mermaid')

    // Content-diff: an unchanged model regenerates nothing.
    const again = await Docs.doc_gen(model, { root })
    expect(again.created).toEqual([])

    // Services without a folder get no README (only 'thing' exists).
    expect(Fs.existsSync(
      Path.join(root, 'backend/src/srv/other/README.md'))).toBe(false)
  })

  test('system map without web env uses plain client node', async () => {
    const model = makeModel()
    model.main.env.web.active = false
    delete model.main.srv.thing.deps
    const root = tmpProject()
    await Docs.doc_gen(model, { root })
    const map = read(root, 'docs/reference/system-map.md')
    expect(map).toContain('client([Clients])')
    expect(map).not.toContain('subgraph spa')
  })
})


describe('api_gen', () => {

  test('generates openapi.json and valid_gen.ts', async () => {
    const model = makeModel()
    const root = tmpProject(['api'])

    const res = await Api.api_gen(model, { root })
    expect(res.created).toEqual([
      'backend/gen/api/openapi.json',
      'backend/src/srv/api/valid_gen.ts',
    ])

    const spec = JSON.parse(read(root, 'backend/gen/api/openapi.json'))
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info.title).toBe('demo API')
    expect(spec.servers).toEqual([{ url: '/api' }])
    // shop/order is deactivated, sys never exposed.
    expect(Object.keys(spec.paths)).toEqual(
      ['/v1/shop/product', '/v1/shop/product/{id}'])
    const schema = spec.components.schemas.ShopProduct
    expect(schema.required).toEqual(['title'])
    expect(schema.properties.id.readOnly).toBe(true)
    expect(schema.properties.title.type).toBe('string')
    expect(schema.properties.price.type).toBe('number')
    expect(schema.properties.live.type).toBe('boolean')
    expect(schema.additionalProperties).toBe(false)
    expect(spec.paths['/v1/shop/product'].get.operationId).toBe('list_shop_product')
    expect(spec.paths['/v1/shop/product'].post.responses['201']).toBeDefined()
    expect(spec.paths['/v1/shop/product/{id}'].delete).toBeDefined()
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer')

    const valid = read(root, 'backend/src/srv/api/valid_gen.ts')
    expect(valid).toContain('AUTO-GENERATED')
    expect(valid).toContain("shapes['shop/product']")
    expect(valid).not.toContain("shapes['shop/order']")
    expect(valid).toContain('title: String,')
    expect(valid).toContain('price: Skip(Number),')
    // update shape: everything optional.
    expect(valid).toContain('title: Skip(String),')
    // Server-managed fields excluded from the shapes (the header comment
    // names them, so check the shape-entry form).
    expect(valid).not.toContain('owner_id:')

    // Content-diff no-op.
    const again = await Api.api_gen(model, { root })
    expect(again.created).toEqual([])
  })

  test('no main.api is a no-op; missing srv/api skips valid_gen', async () => {
    const model = makeModel()
    delete model.main.api
    const root = tmpProject()
    expect((await Api.api_gen(model, { root })).created).toEqual([])

    const model2 = makeModel()
    const root2 = tmpProject()  // no backend/src/srv/api folder
    const res2 = await Api.api_gen(model2, { root: root2 })
    expect(res2.created).toEqual(['backend/gen/api/openapi.json'])
  })
})


describe('web_gen model-driven outputs', () => {

  test('custom views, views.js, theme.css', async () => {
    const model = makeModel()
    const root = tmpProject()

    const res = await EnvWeb.web_gen(model, { root })

    // Custom view starter + doc sidecar, generated index, theme css.
    expect(res.created).toContain('web/src/cmp/view/shop_product.js')
    expect(res.created).toContain('web/src/cmp/view/shop_product.md')
    expect(res.created).toContain('web/src/views.js')
    expect(res.created).toContain('web/src/theme.css')

    const view = read(root, 'web/src/cmp/view/shop_product.js')
    expect(view).toContain('vg-view-shop-product')
    const views = read(root, 'web/src/views.js')
    expect(views).toContain("import './cmp/view/shop_product.js'")

    const theme = read(root, 'web/src/theme.css')
    expect(theme).toContain(':root[data-theme-mode="light"]')
    expect(theme).toContain(':root[data-theme-mode="dark"]')
    expect(theme).toContain('--vg-primary: #111111;')

    // Create-once: a second run creates nothing and skips everything.
    const again = await EnvWeb.web_gen(model, { root })
    expect(again.created).toEqual([])
    expect(again.skipped).toContain('web/src/cmp/view/shop_product.js')

    // Hand edits to create-once files survive; views.js/theme.css follow
    // the model: dropping the custom view + theme removes/regenerates.
    const model2 = makeModel()
    delete model2.main.ent.shop.product.ux
    model2.main.theme.modes = { light: { primary: '#222222' } }
    const res2 = await EnvWeb.web_gen(model2, { root })
    expect(res2.created).toContain('web/src/views.js')
    expect(res2.created).toContain('web/src/theme.css')
    expect(read(root, 'web/src/views.js')).not.toContain('shop_product')
    expect(read(root, 'web/src/theme.css')).not.toContain('dark')

    // force regenerates existing files.
    const res3 = await EnvWeb.web_gen(model2, { root, force: true })
    expect(res3.created).toContain('web/src/main.js')
  })

  test('theme absent generates no theme.css', async () => {
    const model = makeModel()
    delete model.main.theme
    delete model.main.ent.shop.product.ux
    const root = tmpProject()
    const res = await EnvWeb.web_gen(model, { root })
    expect(res.created).not.toContain('web/src/theme.css')
    expect(Fs.existsSync(Path.join(root, 'web/src/theme.css'))).toBe(false)
  })
})
