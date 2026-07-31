/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */

// gen/serverless resources template: SQS queues, DynamoDB tables (via
// yml/res_dynamo_yml), and the basic Lambda IAM role.

import Fs from 'fs'
import Path from 'path'

import { dive, camelify } from '@voxgig/util'

import { MsgMetaShape } from '../../shape/msg'
import { CoreConfShape, CloudConfShape } from '../../shape/conf'

import { res_dynamo_yml } from '../../yml/res_dynamo_yml'

import { generate, loadFragment, renderFragment } from './generate'


const resources_yml = async (model: any, spec: {
  folder: string,
  filename: string
  custom: string,
  tm?: string
}) => {

  const queueFrag = loadFragment('res.queue.yml.frag', spec)
  const roleFrag = loadFragment('res.role.yml.frag', spec)

  const core = CoreConfShape(model.main.conf.core)

  const appname = core.name
  const AppName = camelify(appname)

  const cloud = CloudConfShape(model.main.conf.cloud)

  const region = cloud.aws.region
  const accountid = cloud.aws.accountid

  let filename = spec.filename || 'resources.yml'

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

      let queue_suffix = (null == queue.suffix || '' == queue.suffix) ? '' :
        '-' + queue.suffix

      let resname = 'Queue' + name

      let queueName =
        (queue.prefix || '') +
        path.reduce((s: string, p: string, i: number) =>
        (s += p + (i % 2 ?
          (i == path.length - 1 ? '' : '-') : '_')), '') +
        (queue_suffix || '') +
        (stage_suffix || '')

      let queueTimeout = queue.timeout || 30

      return renderFragment(queueFrag, {
        resname,
        queueName,
        queueTimeout,
      })
    }
    return ''
  }).filter(n => '' !== n).join('')

  // console.log('queueDefs', queueDefs)

  content += '\n\n' + queueDefs

  let customLambdaPolicyStatementPath =
    Path.join(spec.folder, 'res.lambda.policy.statements.yml')
  let customLambdaPolicyStatementContent = Fs.existsSync(customLambdaPolicyStatementPath) ?
    Fs.readFileSync(customLambdaPolicyStatementPath) : ''



  content += renderFragment(roleFrag, {
    AppName,
    dynamoArns: dynamoResources.map(r => '                - ' + r.arn).join('\n'),
    customPolicy: customLambdaPolicyStatementContent,
  })



  if (spec.custom) {
    content = Fs.readFileSync(spec.custom).toString() + '\n\n\n' + content
  }

  content += suffixContent

  content += `
# END
`

  await generate(spec.folder, [{ name: filename, content }])
}


export {
  resources_yml,
}
