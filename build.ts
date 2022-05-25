/* Copyright © 2022 Voxgig Ltd, MIT License. */

import Fs from 'fs'
import Path from 'path'

const EnvLambda = {
  srv_yml: (model: any, spec: {
    folder: string
  }) => {
    console.log('srv_yml', spec)

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
  }
}

export {
  EnvLambda
}


