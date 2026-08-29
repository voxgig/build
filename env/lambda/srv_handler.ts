/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */

// Lambda handler template: one handler source file per lambda service,
// bootstrapping Seneca via the env folder and delegating to gateway-lambda.

import { dive, pinify } from '@voxgig/util'

import { MsgMetaShape } from '../../shape/msg'
import { aimmsgs, msgindex } from '../../util'

import { generate, loadFragment, renderFragment } from './generate'


// Only create if does not exist
const srv_handler = async (model: any, spec: {
  folder: string
  start?: string
  env?: {
    folder: string
  }
  lang?: string
  tm?: string
}) => {
  let lang = spec.lang || 'js'

  const frag = loadFragment('srv_handler.' + lang + '.frag', spec)

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


      // aimmsgs and msgindex read both message declaration shapes; dive()
      // cannot, because fed a flat definition it walks the metadata and emits
      // one entry per scalar field. See util.ts.
      aimmsgs(model.main.msg, name).map((entry: any) => {
        let path = ['aim', name, ...entry[0]]
        let msgMeta = MsgMetaShape(entry[1])
        let pin = pinify(path)
        if (msgMeta.transport?.queue?.active) {
          complete += `
  seneca.listen({type:'sqs',pin:'${pin}'})`
        }
      })


      const msgmeta = msgindex(model.main.msg)

      dive(model.main.srv[name].out, 128).map((entry: any) => {
        let path = entry[0]
        // Looked up by pattern rather than by descending main.msg, so a
        // declared-shape message resolves too.
        let msgMetaMaybe = msgmeta[path.join(',')]
        if (msgMetaMaybe) {
          let msgMeta = MsgMetaShape(msgMetaMaybe)
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


      const content = renderFragment(frag, {
        envFolder,
        start,
        name,
        complete,
        modify,
        prepare,
        handler,
      })

      files.push({ name: name + '.' + lang, content })
    })

  if (0 < files.length) {
    await generate(spec.folder, files)
  }
}


export {
  srv_handler,
}
