
// $$Name$$ backend - AWS Lambda environment bootstrap (generated once;
// this file is yours to edit). The generated handlers
// (src/handler/lambda/<srv>.ts) call getSeneca() for a ready Seneca
// instance wired for the Lambda + API Gateway path, configured by the
// shared setup (src/env/shared/basic.ts).

import Seneca from 'seneca'
import { Live, context } from '@voxgig/system'

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

    // Runtime context: model/pkg/env/stage/srvname. Lambda is the one
    // deployment with a service PER function, so srvname is explicit, and
    // STAGE is resolved here (above) rather than left to context().
    context(seneca, Model, Pkg, { env: 'lambda', srvname, stage: STAGE })

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
