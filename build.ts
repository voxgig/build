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
      .filter((entry: any) => entry[1].env?.lambda)
      .map((entry: any) => {
        const name = entry[0]
        // const srv = entry[1]
        return `${name}:
  handler: src/handlers/${name}.handler
  events:
    - http:
        path: "/api/public/${name}"
        method: POST
        cors: true
`
      }).join('\n\n')

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


