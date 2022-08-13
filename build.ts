/* Copyright © 2022 Voxgig Ltd, MIT License. */

import Fs from 'fs'
import Path from 'path'

import { dive } from '@voxgig/model'

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

        // NOTE: gen.custom covention: allows for complete overwrite
        // as a get-out-of-jail
        if (srv.gen?.custom?.lambda?.srv_yml) {
          return srv.gen.custom.lambda.srv_yml
        }

        let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  events:
`
        const web = srv.api.web

        if (web.active) {
          let prefix = web.path.prefix
          let area = web.path.area
          let method = web.method
          let corsflag = 'false'
          let corsprops = ''

          if (web.cors.active) {
            corsflag = 'true'
            if (web.cors.props && !empty(web.cors.props)) {
              corsflag = ''
              corsprops = Object
                .entries(web.cors.props)
                .reduce(((a: any, nv: any) => (
                  a += `          ${nv[0]}: ${nv[1]}\n`
                  , a)), '')
            }
          }


          srvyml += `    - http:
        path: "${prefix}${area}${name}"
        method: ${method}
        cors: ${corsflag}
${corsprops}
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


  resources_yml: (model: any, spec: {
    folder: string
    custom: string
  }) => {
    let resources_yml_path = Path.join(spec.folder, 'resources.yml')

    let content = dive(model.main.ent).map(entry => {
      // console.log('DYNAMO', entry)
      let path = entry[0]
      let ent = entry[1]

      if (ent && ent.dynamo?.active) {
        let name = path.join('')
        let fullname = ent.dynamo.prefix +
          name +
          ent.dynamo.suffix

        return `${name}:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ${fullname}
    BillingMode: "PAY_PER_REQUEST"
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: "true"
    AttributeDefinitions:
      - AttributeName: "${ent.id.field}"
        AttributeType: "S"
    KeySchema:
      - AttributeName: "${ent.id.field}"
        KeyType: HASH
`
      }
      return ''
    }).join('\n\n\n')

    if (spec.custom) {
      content = Fs.readFileSync(spec.custom).toString() + '\n\n\n' + content
    }

    Fs.writeFileSync(resources_yml_path, content)
  }

}


function empty(o: any) {
  return null == o ? true : 0 === Object.keys(o).length
}


export {
  EnvLambda
}


