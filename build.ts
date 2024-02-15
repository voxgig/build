/* Copyright © 2022 Voxgig Ltd, MIT License. */

import Fs from 'fs'
import Path from 'path'

import { dive, get, pinify, camelify } from '@voxgig/model'

import { MsgMetaShape } from './shape/msg'
import { CloudConfShape } from './shape/conf'

import { res_dynamo_yml } from './yml/res_dynamo_yml'


// console.log('BUILD 1')

const EnvLambda = {

  srv_yml: (model: any, spec: {
    folder: string
  }) => {
    let appname = model.main.conf.core.name
    let AppName = camelify(appname)

    let srv_yml_path = Path.join(spec.folder, 'srv.yml')

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

          // TODO: this should be a JSON structure exported as YAML
          let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  role: Basic${AppName}LambdaRole
  timeout: ${lambda.timeout}
  memorySize: ${lambda.memory || 1024}
`
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



          if ('' !== events) {
            srvyml += TM(`
  events:
${events}
`)
          }


          return srvyml
        }).join('\n\n\n') +
      suffixContent

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
        let envFolder = spec.env?.folder || '../../../env/lambda'

        let handler = 'handler'
        let modify = ''

        //       if (!srv.api.web.active) {
        //         if (srv.on && 0 < Object.keys(srv.on).length) {
        //           handler = 'eventhandler'
        //           modify = `
        // event = {
        //   ...event,
        //   // TODO: @voxgig/system? util needed to handle this dynamically
        //   seneca$: { msg: '${srv.on[Object.keys(srv.on)[0]].events[0].msg}' },
        // }
        //         `
        //         }
        //       }


        let prepare = ''
        let complete = ''


        dive(model.main.msg.aim[name], 128).map((entry: any) => {
          let path = ['aim', name, ...entry[0]]
          let msgMeta = MsgMetaShape(entry[1])
          let pin = pinify(path)
          if (msgMeta.transport?.queue?.active) {
            complete += `
  seneca.listen({type:'sqs',pin:'${pin}'})`
          }
        })


        dive(model.main.srv[name].out, 128).map((entry: any) => {
          let path = entry[0]
          let msgMetaMaybe = get(model.main.msg, path)
          // console.log(name, path, msgMetaMaybe)
          if (msgMetaMaybe?.$) {
            let msgMeta = MsgMetaShape(msgMetaMaybe?.$)
            let pin = pinify(path)

            if (msgMeta.transport?.queue?.active) {
              complete += `
  seneca.client({type:'sqs',pin:'${pin}'})`
            }
          }
        })

        let makeGatewayHandler = false
        let onlist = model.main.srv[name].on || {}
        Object.entries(onlist).map((onitem: any) => {
          onitem[1].events.map((event: any) => {
            if ('s3' === event.source) {
              if (!makeGatewayHandler) {
                complete += `

  const makeGatewayHandler = seneca.export('s3-store/makeGatewayHandler')`
                makeGatewayHandler = true
              }

              complete += `
  seneca
    .act('sys:gateway,kind:lambda,add:hook,hook:handler', {
       handler: makeGatewayHandler('${event.msg}') })`
            }
          })
        })


        let content =
          TS ? `import { getSeneca } from '${envFolder}/${start}'`
            :
            `const getSeneca = require('${envFolder}/${start}')`

        content += `

function complete(seneca: any) {${complete}
}

exports.handler = async (
  event${TS ? ':any' : ''},
  context${TS ? ':any' : ''}
) => {
  ${modify}
  let seneca = await getSeneca('${name}', complete)
  ${prepare}
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


  resources_yml: async (model: any, spec: {
    folder: string,
    filename: string
    custom: string,
  }) => {
    const appname = model.main.conf.core.name
    const AppName = camelify(appname)

    const cloud = CloudConfShape(model.main.conf.cloud)

    const region = cloud.aws.region
    const accountid = cloud.aws.accountid

    let filename = spec.filename || 'resources.yml'
    let resources_yml_path = Path.join(spec.folder, filename)

    let resources_yml_prefix_path = Path.join(spec.folder, 'res.prefix.yml')
    let resources_yml_suffix_path = Path.join(spec.folder, 'res.suffix.yml')

    let prefixContent = Fs.existsSync(resources_yml_prefix_path) ?
      Fs.readFileSync(resources_yml_prefix_path) : ''
    let suffixContent = Fs.existsSync(resources_yml_suffix_path) ?
      Fs.readFileSync(resources_yml_suffix_path) : ''

    const dynamoResources: { arn: string }[] = []

    let content =
      `# START
`

    content +=
      prefixContent +

      await res_dynamo_yml(model, { dynamoResources, region, accountid })

    // content +=
    let queueDefs = dive(model.main.msg, 128).map((entry: any) => {
      let path = entry[0]
      let msgMeta = MsgMetaShape(entry[1])

      let pathname = path
        .map((p: string) =>
          (p[0] + '').toUpperCase() + p.substring(1))
        .join('')

      // console.log('MQ', pathname, msgMeta)

      if (msgMeta.transport?.queue?.active) {
        // console.log('MM', path, msgMeta)
        let queue = msgMeta.transport.queue
        let name = queue.name || pathname

        // TODO: aontu should do this, but needs recursive child conjuncts
        let stage_suffix =
          (false === queue.stage?.active) ? '' : '-${self:provider.stage,"dev"}'

        let resname = 'Queue' + name

        let queueName =
          (queue.prefix || '') +
          path.reduce((s: string, p: string, i: number) =>
          (s += p + (i % 2 ?
            (i == path.length - 1 ? '' : '-') : '_')), '') +
          (queue.suffix || '') +
          (stage_suffix || '')

        let queueTimeout = queue.timeout || 30

        return `${resname}:
  Type: "AWS::SQS::Queue"
  Properties:
    QueueName: '${queueName}'
    VisibilityTimeout: ${queueTimeout}
`
      }
      return ''
    }).filter(n => '' !== n).join('')

    // console.log('queueDefs', queueDefs)

    content += '\n\n' + queueDefs

    let customLambdaPolicyStatementPath =
      Path.join(spec.folder, 'res.lambda.policy.statements.yml')
    let customLambdaPolicyStatementContent = Fs.existsSync(customLambdaPolicyStatementPath) ?
      Fs.readFileSync(customLambdaPolicyStatementPath) : ''



    content += `
Basic${AppName}LambdaRole:
  Type: AWS::IAM::Role
  Properties:
    RoleName: Basic${AppName}LambdaRole\${self:custom.index.BasicLambdaRole,"01"}
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            Service:
              - lambda.amazonaws.com
          Action: sts:AssumeRole
    Policies:
      - PolicyName: LambdaServiceAccess
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - dynamodb:DescribeTable
                - dynamodb:GetItem
                - dynamodb:PutItem
                - dynamodb:UpdateItem
                - dynamodb:DeleteItem
                - dynamodb:Query
                - dynamodb:Scan
              Resource: 
${dynamoResources.map(r => '                - ' + r.arn).join('\n')}
${customLambdaPolicyStatementContent}
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
`



    if (spec.custom) {
      content = Fs.readFileSync(spec.custom).toString() + '\n\n\n' + content
    }

    content += suffixContent

    content += `
# END
`

    Fs.writeFileSync(resources_yml_path, content)
  },



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


