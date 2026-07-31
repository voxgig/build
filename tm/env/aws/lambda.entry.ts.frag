
// $$Name$$ backend - AWS Lambda environment bootstrap (generated once;
// this file is yours to edit). The generated handlers
// (src/handler/lambda/<srv>.ts) call getSeneca() for a ready Seneca
// instance wired for the Lambda + API Gateway path, configured by the
// shared setup (src/env/shared/basic.ts).

import Seneca from 'seneca'
import { Live } from '@voxgig/system'

import { basic, base } from '../shared/basic'

import Pkg from '../../../package.json'
import Model from '../../../model/model.json'


const STAGE = process.env.STAGE || 'local'

const Main = Model.main as any

let seneca: any = null


async function getSeneca(srvname: string, complete: Function): Promise<any> {
  const { deep } = Seneca.util

  if (null == seneca) {
    const srv = Main.srv[srvname]

    seneca = Seneca(deep(base.seneca, {
      tag: srvname + '-$$name$$-' + STAGE + '@' + Pkg.version,
      timeout: srv.env.lambda.timeout * 60 * 1000,
    })).test()

    seneca.context.model = Model
    seneca.context.srvname = srvname
    seneca.context.stage = STAGE
    seneca.context.env = 'lambda'
    seneca.context.pkg = Pkg

    basic(seneca, { reload: { active: false } })

    seneca
      .use('gateway')
      .use('gateway-lambda', {
        auth: {
          token: {
            name: '$$name$$-auth',
          },
        },
      })
      .use('gateway-auth', {
        spec: {
          lambda_cookie: {
            active: true,
            token: {
              name: '$$name$$-auth',
            },
            user: {
              auth: true,
              require: srv.user?.required ?? true,
            },
          },
        },
      })

    seneca.use(Live, {
      srv: {
        name: srvname,
        folder: __dirname + '/../../srv',
      },
    })

    // Call ready() exactly once - a second ready() on an already-ready
    // instance never resolves under seneca 4.0.0-rc4.
    await seneca.ready()

    if (complete) {
      await complete(seneca)
    }
  }

  return seneca
}


export {
  getSeneca,
}
