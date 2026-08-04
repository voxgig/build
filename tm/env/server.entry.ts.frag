
// $$Name$$ backend - $$env$$ environment entry (generated once; this file
// is yours to edit). A long-lived server process using the shared Seneca
// setup (src/env/shared/basic.ts); reads its env config from the model
// (main.env.$$env$$).

import Seneca from 'seneca'
import { Local, context, devtools } from '@voxgig/system'

import { basic, base } from '../shared/basic'

import Pkg from '../../../package.json'
import Model from '../../../model/model.json'


run()


async function run() {
  const { deep } = Seneca.util

  const envdef: any = (Model as any).main.env?.['$$env$$'] || {}

  const seneca = Seneca(deep(base.seneca, {
    tag: '$$name$$-$$env$$',
    log: { level: envdef.log || 'warn' },
  }, envdef.seneca || {}))

  // Runtime context: model/pkg/env/stage/srvname. `stage` resolves from
  // STAGE, then the model's main.env.$$env$$.stage, then the env name.
  context(seneca, Model, Pkg, { env: '$$env$$' })

  // Dev-only behaviour, from the model: seneca.test() and the @seneca/repl
  // dev REPL. Declared in main.conf.dev, overridable per environment in
  // main.env.$$env$$.dev, and at runtime with SENECA_TEST / SENECA_REPL /
  // SENECA_REPL_PORT. Both default to OFF - a long-lived server picks up
  // neither unless the model asks for it.
  devtools(seneca, Model, { env: '$$env$$' })

  basic(seneca)

  seneca.use(Local, {
    srv: {
      folder: __dirname + '/../../../dist/srv',
    },
  })

  await seneca.ready()

  console.log('$$name$$-backend started', {
    env: '$$env$$', version: Pkg.version, port: $$port$$,
  })
}
