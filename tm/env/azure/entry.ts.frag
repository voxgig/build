
// $$Name$$ backend - azure environment entry (generated once; this file is
// yours to edit). STARTING POINT: an Azure Functions HTTP handler shape -
// wire the Seneca gateway the way src/env/lambda/lambda.ts does for AWS.

import Seneca from 'seneca'

import { basic, base } from '../shared/basic'

import Pkg from '../../../package.json'
import Model from '../../../model/model.json'


let seneca: any = null

async function getSeneca(): Promise<any> {
  if (null == seneca) {
    seneca = Seneca(Seneca.util.deep(base.seneca, {
      tag: '$$name$$-azure@' + Pkg.version,
    })).test()

    seneca.context.model = Model
    seneca.context.env = 'azure'
    seneca.context.pkg = Pkg

    basic(seneca, { reload: { active: false } })

    await seneca.ready()
  }
  return seneca
}


// Azure Functions v4 programming model handler (add @azure/functions and
// register per-route handlers derived from the model - see
// gen/env/aws/srv.yml for the full route list).
async function handler(request: any, _context: any) {
  await getSeneca()
  return {
    status: 501,
    jsonBody: { ok: false, why: '$$name$$-backend azure entry not yet wired' },
  }
}


export {
  getSeneca,
  handler,
}
