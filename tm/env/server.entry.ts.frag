
// $$Name$$ backend - $$env$$ environment entry (generated once; this file
// is yours to edit). A long-lived server process using the shared Seneca
// setup (src/env/shared/basic.ts); reads its env config from the model
// (main.env.$$env$$).

import Seneca from 'seneca'
import { Local } from '@voxgig/system'

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

  seneca.context.model = Model
  seneca.context.env = '$$env$$'
  seneca.context.stage = process.env.STAGE || '$$env$$'
  seneca.context.srvname = 'all'
  seneca.context.pkg = Pkg

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
