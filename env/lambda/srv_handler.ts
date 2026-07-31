/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */

// Lambda handler template: one handler source file per lambda service,
// bootstrapping Seneca via the env folder and delegating to gateway-lambda.

import { dive, get, pinify } from '@voxgig/util'

import { MsgMetaShape } from '../../shape/msg'

import { generate } from './generate'


// Only create if does not exist
const srv_handler = async (model: any, spec: {
  folder: string
  start?: string
  env?: {
    folder: string
  }
  lang?: string
}) => {
  let lang = spec.lang || 'js'
  let TS = 'ts' === lang

  const files: { name: string, content: string }[] = []

  Object
    .entries(model.main.srv)
    .filter((entry: any) => entry[1].env?.lambda)
    .forEach((entry: any) => {
      const name = entry[0]
      const srv = entry[1]

      if ('custom' === srv.env.lambda.kind) {
        return
      }

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

      files.push({ name: name + '.' + lang, content })
    })

  if (0 < files.length) {
    await generate(spec.folder, files)
  }
}


export {
  srv_handler,
}
