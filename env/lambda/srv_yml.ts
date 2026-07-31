/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */

// gen/serverless/srv.yml template: one Serverless function definition per
// lambda-active service, derived from the model.

import Fs from 'fs'
import Path from 'path'

import { camelify } from '@voxgig/util'

import { CoreConfShape } from '../../shape/conf'

import { generate, empty, TM, loadFragment, renderFragment } from './generate'


const srv_yml = async (model: any, spec: {
  folder: string
  tm?: string
}) => {

  const core = CoreConfShape(model.main.conf.core)

  let appname = core.name
  let AppName = camelify(appname)

  const frag = loadFragment('srv.yml.frag', spec)

  let srv_yml_prefix_path = Path.join(spec.folder, 'srv.prefix.yml')
  let srv_yml_suffix_path = Path.join(spec.folder, 'srv.suffix.yml')

  let prefixContent = Fs.existsSync(srv_yml_prefix_path) ?
    Fs.readFileSync(srv_yml_prefix_path) : ''
  let suffixContent = Fs.existsSync(srv_yml_suffix_path) ?
    Fs.readFileSync(srv_yml_suffix_path) : ''

  let content =

    prefixContent +
    Object
      .entries(model.main.srv)
      .filter((entry: any) => entry[1].env?.lambda?.active)
      .map((entry: any) => {
        const name = entry[0]
        const srv = entry[1]

        const lambda = srv.env.lambda
        const handler = lambda.handler

        // NOTE: gen.custom convention: allows for complete overwrite
        // as a get-out-of-jail
        if (srv.gen?.custom?.lambda?.srv_yml) {
          return srv.gen.custom.lambda.srv_yml
        }

        const web = srv.api.web

        let events = ''

        let onEvents = srv.on

        if (onEvents) {
          Object.entries(onEvents).forEach((entry: any[]) => {
            // let name = entry[0]
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
                else if ('sqs' === ev.source) {
                  events += TM(`
    - sqs:
        arn:
          Fn::GetAtt:
            - ${ev.qrn}
            - Arn
        batchSize: 1
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

          let methods = method.split(',')
          // console.log('METHODS', methods)

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
            for (let method of methods) {
              events += TM(`
    - httpApi:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
`)
            }
          }
          else {
            for (let method of methods) {
              events += TM(`
    - http:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
        cors: ${corsflag}
${corsprops}
`)
            }
          }
        }



        let eventsBlock = ''
        if ('' !== events) {
          eventsBlock = TM(`
  events:
${events}
`)
        }

        return renderFragment(frag, {
          name,
          handler: handler.path.prefix + name + handler.path.suffix,
          AppName,
          timeout: lambda.timeout,
          memory: lambda.memory || 1024,
          events: eventsBlock,
        })
      }).join('\n\n\n') +
    suffixContent

  await generate(spec.folder, [{ name: 'srv.yml', content }])
}


export {
  srv_yml,
}
