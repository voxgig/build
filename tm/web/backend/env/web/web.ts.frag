
// Local web runner: the local in-memory backend plus an HTTP layer for
// the SPA - express serving web/dist, the model, and a single seneca
// gateway endpoint (/seneca) that the browser-side Seneca bus posts
// messages to (seneca-browser fetch transport). Cookie auth via
// @seneca/gateway-auth (express_cookie): signin sets the todo-auth
// cookie, after which the gateway attaches the principal so @seneca/owner
// scopes todos per user.
//
// Predefined users are seeded at startup (local testing only).

import Path from 'node:path'

import Express from 'express'
import CookieParser from 'cookie-parser'

import Seneca from 'seneca'
import { Local } from '@voxgig/system'

import { basic, base } from '../shared/basic'
import { seedDemo } from '../shared/seed'

import Pkg from '../../../package.json'
import Model from '../../../model/model.json'


const PORT = parseInt(process.env.PORT || '', 10) ||
  (Model as any).main.conf.port.backend

// Predefined users seeded at startup (local testing only). Edit freely.
const USERS = $$users$$


run()


async function run() {
  const { deep } = Seneca.util

  const seneca = Seneca(deep(base.seneca, { tag: '$$name$$-web' }))

  seneca.context.model = Model
  seneca.context.env = 'local'
  seneca.context.stage = 'local'
  seneca.context.srvname = 'all'
  seneca.context.pkg = Pkg

  seneca.test()

  basic(seneca)

  seneca
    .use('gateway', {
      // Allow auth + every service the model declares (aim:<srv>).
      allow: Object.keys((Model as any).main.srv).reduce(
        (a: any, n: string) => (a['aim:' + n] = true, a),
        { 'aim:req,on:auth': true }),
    })
    .use('gateway-express', {
      // gateway-express sets/clears the auth cookie when a result carries
      // gateway$.auth (see web_signin_user / web_signout_user). Cookie
      // attributes use the plugin defaults (httpOnly, sameSite).
      auth: {
        token: {
          name: '$$name$$-auth',
        },
      },
    })
    .use('gateway-auth', {
      spec: {
        express_cookie: {
          active: true,
          token: {
            name: '$$name$$-auth',
          },
          user: {
            auth: true,
            require: false,
          },
        },
      },
    })

  seneca.use(Local, {
    srv: {
      folder: __dirname + '/../../../dist/srv',
    },
  })

  await seneca.ready()

  // Seed the predefined users (idempotent per boot: in-memory store).
  const usersByEmail: Record<string, any> = {}
  for (const u of USERS) {
    const res = await seneca.post('sys:user,register:user', u)
    if (!res.ok) {
      console.log('SEED-USER-FAILED', u.email, res.why)
    }
    const got = await seneca.post('sys:user,get:user', { email: u.email })
    if (got.ok && got.user) {
      usersByEmail[u.email] = got.user
    }
  }

  // Seed demo projects/todolists/items (collaborative, one shared project).
  await seedDemo(seneca, usersByEmail)

  const app = Express()
  // web/ is a sibling of backend/; from dist/env/local go up to the
  // project root, then web/dist.
  const webdist = Path.join(
    __dirname, '..', '..', '..', '..', 'web', 'dist')

  app
    .use(Express.json())
    .use(new (CookieParser as any)())
    .post('/seneca', seneca.export('gateway-express/handler'))
    .get('/model.json',
      (_req: any, res: any) => res.sendFile(
        Path.join(__dirname, '..', '..', '..', 'model', 'model.json')))
    .use(Express.static(webdist))
    .listen(PORT)

  console.log('$$name$$-web started', {
    port: PORT,
    users: USERS.map((u) => u.email),
    version: Pkg.version,
  })
}
