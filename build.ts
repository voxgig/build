/* Copyright © 2022 Voxgig Ltd, MIT License. */

import Fs from 'fs'
import Path from 'path'

const EnvLambda = {

  srv_yml: (model: any, spec: {
    folder: string
  }) => {
    let srv_yml_path = Path.join(spec.folder, 'srv.yml')

    let content = Object
      .entries(model.main.srv)
      .filter((entry: any) => entry[1].env?.lambda?.active)
      .map((entry: any) => {
        const name = entry[0]
        const srv = entry[1]

        const lambda = srv.env.lambda
        const handler = lambda.handler

        let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  events:
`
        const web = srv.api.web

        if (web.active) {
          let prefix = web.path.prefix
          let area = web.path.area
          let method = web.method
          let cors = web.cors.active ? 'true' : 'false'
          srvyml += `    - http:
        path: "${prefix}${area}${name}"
        method: ${method}
        cors: ${cors}
`
        }

        return srvyml
      }).join('\n\n\n')

    Fs.writeFileSync(srv_yml_path, content)
  },


  // Only create if does not exist
  srv_handler: (model: any, spec: {
    folder: string
  }) => {
    Object
      .entries(model.main.srv)
      .filter((entry: any) => entry[1].env?.lambda)
      .forEach((entry: any) => {
        const name = entry[0]
        // const srv = entry[1]
        let srv_handler_path = Path.join(spec.folder, name + '.js')

        let content = `
const getSeneca = require('../../env/lambda/setup')

exports.handler = async (event, context) => {
  let seneca = await getSeneca()
  let handler = seneca.export('gateway-lambda/handler')
  let res = await handler(event, context)
  return res
}
`

        if (!Fs.existsSync(srv_handler_path)) {
          Fs.writeFileSync(srv_handler_path, content)
        }
      })
  },

}

export {
  EnvLambda
}


