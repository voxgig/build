/* Copyright © 2022 Voxgig Ltd, MIT License. */

import Fs from 'fs'
import Path from 'path'

import { dive } from '@voxgig/model'
import {
  dynamoTable,
  gwDeployment,
  gwLambda,
  gwResource,
  gwStage,
  iamRole,
  lambdaBucket,
  lambdaFunc,
  lambdaPermissions,
  provider
} from './templates/terraform/resources'

import { EntShape } from './build'

export const main_tf = (
  model: any,
  spec: {
    folder: any
    filename: string
  }
) => {
  // console.log('main_tf', spec)
  let filename = spec.filename || 'main.tf'
  let main_tf_path = Path.join(spec.folder, filename)

  // TODO: add suffix when creating GW resources

  // Terraform
  let content = provider({})

  content += `# DynamoDB tables\n\n`

  // DynamoDB tables
  content += dive(model.main.ent)
    .map((entry: any) => {
      let path = entry[0]
      let ent = EntShape(entry[1])

      if (ent && ent.dynamo?.active) {
        let pathname = path.join('')
        let name = ent.resource?.name || pathname

        let stage_suffix = ent.stage?.active ? '.${var.stage}' : ''

        let fullname =
          ent.dynamo.prefix + name + ent.dynamo.suffix + stage_suffix

        return dynamoTable({
          ctx: {
            name: name,
            fullname: fullname,
            idField: ent.id.field
          }
        })
      }

      return ''
    })
    .join('\n\n')

  content += `\n\n# Lambda IAM role`

  // Lambda IAM role
  content += iamRole({})

  content += `# S3 bucket for Lambda code\n\n`

  // S3 bucket for Lambda code
  content += lambdaBucket()

  content += `# Lambda functions\n\n`

  // Create Lambda functions
  content += Object.entries(model.main.srv)
    .map((entry: any) => {
      const name = entry[0]
      const srv = entry[1]

      const lambda = srv.env.lambda
      const handler = lambda.handler
      const prefix = handler.path.prefix
      const suffix = handler.path.suffix

      // Define lambda module
      let lambdaConfig = lambdaFunc({
        name: name,
        prefix: prefix,
        suffix: suffix,
        timeout: lambda.timeout
      })

      // Define cloud events if srv.on
      let onEvents = srv.on
      if (onEvents) {
        Object.entries(onEvents).forEach((entry: any[]) => {
          // let name = entry[0]
          let spec = entry[1]
          if ('aws' === spec.provider) {
            lambdaConfig += lambdaPermissions({
              name: name
            })

            let events = ''
            let prefix = ''
            let suffix = ''

            lambdaConfig += `\n\nresource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.user_uploads.id

  lambda_function {
    lambda_function_arn = module.upload_lambda.arn`

            spec.events
              .filter((ev: any) => ev.source === 's3')
              .forEach((ev: any) => {
                events += `"${ev.event}",`
                if (ev.rules) {
                  prefix = ev.rules.prefix || prefix
                  suffix = ev.rules.suffix || suffix
                }
              })

            if (prefix !== '') {
              lambdaConfig += `\n\t\tfilter_prefix = "${prefix}"`
            }

            if (suffix !== '') {
              lambdaConfig += `\n\t\tfilter_suffix = "${suffix}"`
            }

            events = `[${events}]`
            events = events.replace(',]', ']')
            lambdaConfig += `\n\t\tevents = ${events}\n\t}\n}`
          }
        })
      }

      return lambdaConfig
    })
    .join('\n\n')

  content += `\n\n# API Gateway endpoints`

  content += `# API Gateway resources\n\n`

  // API Gateway resources
  content += `resource "aws_api_gateway_rest_api" "gw_rest_api" {
  name = "\${var.stage}-vxg01-backend01"
}\n\n`

  let gwResources: any = []

  content += Object.entries(model.main.srv)
    .filter((entry: any) => entry[1].env?.lambda?.active)
    .map((entry: any) => {
      const name = entry[0]
      const srv = entry[1]

      const web = srv.api.web

      let gwResStr = ''

      if (web.active) {
        let prefix = web.path.prefix
        let area = web.path.area

        // split prefix into parts and remove empty parts
        let parts = prefix.split('/').filter((part: string) => part !== '')
        let root = parts[0]
        let parent = parts[0]

        // create nested resources
        parts.forEach((part: string) => {
          // console.log('part:', part, 'root:', root, 'parent:', parent)

          if (part == root && !gwResources.includes(part)) {
            gwResStr += `resource "aws_api_gateway_resource" "${part}" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_rest_api.gw_rest_api.root_resource_id
  path_part   = "${part}"
}\n\n`
            // add part to gwResources
            gwResources.push(part)
            // check part not in gwResources
          } else if (!gwResources.includes(part)) {
            gwResStr += `resource "aws_api_gateway_resource" "${part}" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_resource.${parent}.id
  path_part   = "${part}"
}\n\n`
            // add part to gwResources
            gwResources.push(part)
          }
          parent = part
        })

        // remove / from area
        area = area.replace('/', '')

        if (area !== '' && !gwResources.includes(area)) {
          gwResStr += gwResource({
            area: area,
            parent: parent
          })
        }

        gwResources.push(area)

        return gwResStr
      }
      return ''
    })
    .join('\n\n')

  let dependsOn = ''
  let triggers = ''

  // API Gateway endpoints
  content += Object.entries(model.main.srv)
    .filter((entry: any) => entry[1].env?.lambda?.active)
    .map((entry: any) => {
      const name = entry[0]
      const srv = entry[1]

      const web = srv.api.web

      if (web.active) {
        let area = web.path.area
        let resource = area.replace('/', '')

        dependsOn += `
          module.gw_${name}_lambda.gw_integration_id,`
        triggers += `
          module.gw_${name}_lambda.gw_integration_id,
          module.gw_${name}_lambda.gw_method_id,
          module.gw_${name}_lambda.gw_resource_id,`

        return gwLambda({
          name: name,
          resource: resource
        })
      }
      return ''
    })
    .join('\n\n')

  dependsOn = `[${dependsOn}]`
  dependsOn = dependsOn.replace(',]', '\n\t]')
  triggers = `[${triggers}]`
  triggers = triggers.replace(',]', '\n\t\t]')

  // API Gateway deployment
  content += gwDeployment({
    dependsOn: dependsOn,
    triggers: triggers
  })

  // API Gateway stage
  content += gwStage({})

  Fs.writeFileSync(main_tf_path, content)
}

export const modules_tf = (
  model: any,
  spec: { folder: any; filename: string }
) => {
  console.log('modules_tf', spec.folder, spec.filename)
  let filename = spec.filename || 'modules.tf'
  let modules_src_path = Path.join(
    __dirname,
    'templates',
    'terraform',
    'modules'
  )
  let modules_dest_path = Path.join(spec.folder, 'modules')

  copyDirectory(modules_src_path, modules_dest_path)
}

function copyDirectory (src: string, dest: string): void {
  if (!Fs.existsSync(dest)) {
    Fs.mkdirSync(dest, { recursive: true })
  }

  let entries = Fs.readdirSync(src, { withFileTypes: true })

  for (let entry of entries) {
    let srcPath = Path.join(src, entry.name)
    let destPath = Path.join(dest, entry.name)

    entry.isDirectory()
      ? copyDirectory(srcPath, destPath)
      : Fs.copyFileSync(srcPath, destPath)
  }
}
