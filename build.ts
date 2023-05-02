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


        // TODO: this should be a JSON structure exported as YAML
        let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  timeout: ${lambda.timeout}
`
        const web = srv.api.web

        let events = ''

        let onEvents = srv.on

        if (onEvents) {
          Object.entries(onEvents).forEach((entry: any[]) => {
            let name = entry[0]
            let spec = entry[1]

            if ('aws' === spec.provider) {
              spec.events.forEach((ev: any) => {
                if ('s3' === ev.source) {
                  events += TM(`
    - s3:
        bucket: ${ev.bucket}
        event: ${ev.event}
        existing: true
`)
                  if (ev.rules) {
                    events += TM(`
        rules:
`)
                    if (ev.rules.prefix) {
                      events += TM(`
          - prefix: ${ev.rules.prefix}
`)
                    }

                    if (ev.rules.suffix) {
                      events += TM(`
          - suffix: ${ev.rules.suffix}
`)
                    }
                  }
                }
                else if ('schedule' === ev.source) {
                  let entries =
                    'string' === typeof ev.recur ? [ev.recur] : (ev.recur || [])
                  let recur = entries.map((entry: string) => {
                    let schedule = `
    - schedule:
        rate: ${entry}`
                    if (ev.msg) {
                      schedule += `
        input:
          msg: ${JSON.stringify(ev.msg)} `
                    }
                    return schedule
                  })

                  events += TM(`
${recur}
`)

                }
              })
            }
          })
        }

        // TODO: move to `on`
        if (web.active) {
          let prefix = web.path.prefix
          let suffix = web.path.suffix
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

          if ('v2' === web.lambda?.gateway) {
            events += TM(`
    - httpApi:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
`)

          }
          else {

            events += TM(`
    - http:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
        cors: ${corsflag}
${corsprops}
`)
          }
        }



        if ('' !== events) {
          srvyml += TM(`
  events:
${events}
`)
        }


        return srvyml
      }).join('\n\n\n')

    Fs.writeFileSync(srv_yml_path, content)
  },


  // Only create if does not exist
  srv_handler: (model: any, spec: {
    folder: string
    start?: string
    env?: {
      folder: string
    }
    lang?: string
  }) => {
    let lang = spec.lang || 'js'
    let TS = 'ts' === lang

    Object
      .entries(model.main.srv)
      .filter((entry: any) => entry[1].env?.lambda)
      .forEach((entry: any) => {
        const name = entry[0]
        const srv = entry[1]

        if ('custom' === srv.env.lambda.kind) {
          return
        }

        let srv_handler_path = Path.join(spec.folder, name + '.' + lang)

        let start = spec.start || 'setup'
        let envFolder = spec.env?.folder || '../../env/lambda'

        let handler = 'handler'
        let modify = ''

        if (!srv.api.web.active) {
          if (srv.on && 0 < Object.keys(srv.on).length) {
            handler = 'eventhandler'
            modify = `
  event = {
    ...event,
    // TODO: @voxgig/system? util needed to handle this dynamically
    seneca$: { msg: '${srv.on[Object.keys(srv.on)[0]].events[0].msg}' },
  }
          `
          }
        }

        let content =
          TS ? `import getSeneca from '${envFolder}/${start}'`
            :
            `const getSeneca = require('${envFolder}/${start}')`

        content += `

exports.handler = async (
  event${TS ? ':any' : ''},
  context${TS ? ':any' : ''}
) => {
  ${modify}
  let seneca = await getSeneca('${name}')
  let handler = seneca.export('gateway-lambda/${handler}')
  let res = await handler(event, context)
  return res
}
`

        // TODO: make this an option
        //if (!Fs.existsSync(srv_handler_path)) {
        Fs.writeFileSync(srv_handler_path, content)
      })
  },


  resources_yml: (model: any, spec: {
    folder: string,
    filename: string
    custom: string,
  }) => {
    let filename = spec.filename || 'resources.yml'
    let resources_yml_path = Path.join(spec.folder, filename)

    let content = dive(model.main.ent).map((entry: any) => {
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
  DeletionPolicy: Retain
  Properties:
    TableName: ${fullname}
    BillingMode: "PAY_PER_REQUEST"
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: "true"
    DeletionProtectionEnabled: true
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

// Strip inital newline
function TM(str: string) {
  return str.replace(/^\n/, '')
}



export {
  EnvLambda
}


