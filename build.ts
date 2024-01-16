/* Copyright © 2022 Voxgig Ltd, MIT License. */

import Fs from 'fs'
import Path from 'path'

import { Gubu } from 'gubu'
import { dive } from '@voxgig/model'

const { Open, Skip } = Gubu

const EntShape = Gubu({
  id: {
    field: 'id'
  },
  field: Open({}).Child({}),
  resource: Open({
    name: ''
  }),
  dynamo: Open({
    active: false,
    prefix: '',
    suffix: ''
  }),
  stage: Open({
    active: false
  }),
  custom: Skip(String)
})

const EnvLambda = {
  srv_yml: (
    model: any,
    spec: {
      folder: string
    }
  ) => {
    let srv_yml_path = Path.join(spec.folder, 'srv.yml')

    let srv_yml_prefix_path = Path.join(spec.folder, 'srv.prefix.yml')
    let srv_yml_suffix_path = Path.join(spec.folder, 'srv.suffix.yml')

    let prefixContent = Fs.existsSync(srv_yml_prefix_path)
      ? Fs.readFileSync(srv_yml_prefix_path)
      : ''
    let suffixContent = Fs.existsSync(srv_yml_suffix_path)
      ? Fs.readFileSync(srv_yml_suffix_path)
      : ''

    let content =
      prefixContent +
      Object.entries(model.main.srv)
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
  timeout: ${lambda.timeout}
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
                  } else if ('schedule' === ev.source) {
                    let entries =
                      'string' === typeof ev.recur ? [ev.recur] : ev.recur || []
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

            let methods = method.split(',')
            // console.log('METHODS', methods)

            if (web.cors.active) {
              corsflag = 'true'
              if (web.cors.props && !empty(web.cors.props)) {
                corsflag = ''
                corsprops = Object.entries(web.cors.props).reduce(
                  (a: any, nv: any) => (
                    (a += `          ${nv[0]}: ${nv[1]}\n`), a
                  ),
                  ''
                )
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
            } else {
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
        })
        .join('\n\n\n') +
      suffixContent

    Fs.writeFileSync(srv_yml_path, content)
  },

  // Only create if does not exist
  srv_handler: (
    model: any,
    spec: {
      folder: string
      start?: string
      env?: {
        folder: string
      }
      lang?: string
    }
  ) => {
    let lang = spec.lang || 'js'
    let TS = 'ts' === lang

    Object.entries(model.main.srv)
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

        let content = TS
          ? `import { getSeneca } from '${envFolder}/${start}'`
          : `const getSeneca = require('${envFolder}/${start}')`

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

  resources_yml: (
    model: any,
    spec: {
      folder: string
      filename: string
      custom: string
    }
  ) => {
    let filename = spec.filename || 'resources.yml'
    let resources_yml_path = Path.join(spec.folder, filename)

    let resources_yml_prefix_path = Path.join(spec.folder, 'res.prefix.yml')
    let resources_yml_suffix_path = Path.join(spec.folder, 'res.suffix.yml')

    let prefixContent = Fs.existsSync(resources_yml_prefix_path)
      ? Fs.readFileSync(resources_yml_prefix_path)
      : ''
    let suffixContent = Fs.existsSync(resources_yml_suffix_path)
      ? Fs.readFileSync(resources_yml_suffix_path)
      : ''

    let content =
      prefixContent +
      dive(model.main.ent)
        .map((entry: any) => {
          // console.log('DYNAMO', entry)
          let path = entry[0]
          let ent = EntShape(entry[1])

          if (ent && ent.dynamo?.active) {
            let pathname = path.join('')
            let name = ent.resource?.name || pathname

            let stage_suffix = ent.stage?.active
              ? '.${self:provider.stage,"dev"}'
              : ''

            let fullname =
              ent.dynamo.prefix + name + ent.dynamo.suffix + stage_suffix

            return `${name}:
  Type: AWS::DynamoDB::Table
  DeletionPolicy: Retain
  Properties:
    TableName: '${fullname}'
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
        })
        .join('\n\n\n')

    if (spec.custom) {
      content = Fs.readFileSync(spec.custom).toString() + '\n\n\n' + content
    }

    content += suffixContent

    Fs.writeFileSync(resources_yml_path, content)
  },

  main_tf: (
    model: any,
    spec: {
      folder: any
    }
  ) => {
    let filename = 'main.tf'
    let main_tf_path = Path.join(spec.folder, filename)

    // Terraform
    let content = `terraform {

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4.1"
    }
  }

  required_version = "~> 1.6.6"
} \n\n`

    // Provider
    content += `provider "aws" {
  region = "eu-west-1"
}\n\n`

    // Variables
    content += `variable "stage" {
  type = string
  default = "tf02"
}\n\n`

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

          return `resource "aws_dynamodb_table" "${name}" {
  name         = "${fullname}"
  hash_key     = "${ent.id.field}"
  billing_mode = "PAY_PER_REQUEST"

  point_in_time_recovery {
    enabled = true
  }

  attribute {
    name = "${ent.id.field}"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}`
        }

        return ''
      })
      .join('\n\n\n')

    content += `# Lambda IAM role\n\n`

    // Lambda IAM role
    content += `\n\nresource "aws_iam_role" "lambda_exec_role" {
  name = "\${var.stage}-vxg01-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      }
    ]
  })
}

resource "aws_iam_policy" "dynamodb_policy" {
  name        = "DynamoDBFullAccessPolicy"
  description = "IAM policy for full access to DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "dynamodb:*",
        Effect = "Allow",
        Resource = "*"
      },
    ],
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach_dynamo" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

resource "aws_iam_policy" "cloudwatch_policy" {
  name        = "cloudwatch_policy"
  description = "IAM policy for logging from a lambda"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:TagResource"
        ],
        Resource = "arn:aws:logs:*:*:*",
        Effect   = "Allow",
      },
    ],
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach_cloudwatch" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.cloudwatch_policy.arn
}\n\n`

    content += `# S3 bucket for Lambda code\n\n`

    // S3 bucket for Lambda code
    content += `resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "vxg01-\${var.stage}-lambda-bucket"
}

resource "aws_s3_bucket_ownership_controls" "lambda_bucket" {
  bucket = aws_s3_bucket.lambda_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "lambda_bucket" {
  depends_on = [aws_s3_bucket_ownership_controls.lambda_bucket]

  bucket = aws_s3_bucket.lambda_bucket.id
  acl    = "private"
}

resource "aws_s3_object" "lambda_s3_object" {
  bucket = aws_s3_bucket.lambda_bucket.bucket
  key    = "lambda/vxg01-\${var.stage}-lambda-bucket.zip"
  source = "\${path.root}/../../../backend.zip"
  etag   = filemd5("\${path.root}/../../../backend.zip")
}\n\n`

    content += `# S3 bucket for user uploads\n\n`

    // S3 bucket for user uploads
    // FIXME: create uploads bucket only if needed
    content += `resource "aws_s3_bucket" "user_uploads" {
  bucket = "vxg01-backend01-file02-\${var.stage}"
}

resource "aws_s3_bucket_cors_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["*.cloudfront.net"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_iam_policy" "user_uploads_policy" {
  name        = "user_uploads_policy"
  policy      = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "\${aws_s3_bucket.user_uploads.arn}",
          "\${aws_s3_bucket.user_uploads.arn}/*"
        ]
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach_s3_" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.user_uploads_policy.arn
}\n\n`

    content += `# API Gateway resources\n\n`

    // API Gateway resources
    content += `resource "aws_api_gateway_rest_api" "gw_rest_api" {
  name = "\${var.stage}-vxg01-backend01"
}

resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_rest_api.gw_rest_api.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "web" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "web"
}

resource "aws_api_gateway_resource" "private" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_resource.web.id
  path_part   = "private"
}

resource "aws_api_gateway_resource" "public" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_resource.web.id
  path_part   = "public"
}\n\n`

    content += `# Lambda functions\n\n`

    // Lambda functions
    content += Object.entries(model.main.srv)
      .map((entry: any) => {
        const name = entry[0]
        const srv = entry[1]

        let lambdaConfig = `module "${name}_lambda" {
  source = "./modules/lambda_module"
  function_name = "vxg01-backend01-\${var.stage}-${name}"
  handler = "dist/handler/${name}.handler"
  role_arn = aws_iam_role.lambda_exec_role.arn
  s3_bucket = aws_s3_bucket.lambda_bucket.bucket
  s3_key = aws_s3_object.lambda_s3_object.key
}\n\n`

        let onEvents = srv.on
        if (onEvents) {
          Object.entries(onEvents).forEach((entry: any[]) => {
            // let name = entry[0]
            let spec = entry[1]
            if ('aws' === spec.provider) {
              lambdaConfig += `resource "aws_lambda_permission" "allow_${name}_uploads_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = module.${name}_lambda.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.user_uploads.arn
}`

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
          let prefix = web.path.prefix
          let suffix = web.path.suffix
          let area = web.path.area
          let resource = area.replace('/', '')
          let method = web.method

          dependsOn += `
          module.gw_${name}_lambda.gw_integration_id,`
          triggers += `
          module.gw_${name}_lambda.gw_integration_id,
          module.gw_${name}_lambda.gw_method_id,
          module.gw_${name}_lambda.gw_resource_id,`

          return `module "gw_${name}_lambda" {
  source = "./modules/gw_module"
  function_name = module.${name}_lambda.function_name
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id = aws_api_gateway_resource.${resource}.id
  path_part = "${name}"
  invoke_arn = module.${name}_lambda.invoke_arn
}
`
        }
        return ''
      })
      .join('\n\n')

    dependsOn = `[${dependsOn}]`
    dependsOn = dependsOn.replace(',]', '\n\t]')
    triggers = `[${triggers}]`
    triggers = triggers.replace(',]', '\n\t\t]')

    // API Gateway deployment
    content += `resource "aws_api_gateway_deployment" "gw_deployment" {

  depends_on = ${dependsOn}

  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id

  triggers = {
    redeployment = sha1(jsonencode(${triggers}))
  }

  lifecycle {
    create_before_destroy = true
  }
}\n\n`

    // API Gateway stage
    content += `resource "aws_api_gateway_stage" "gw_stage" {
  deployment_id = aws_api_gateway_deployment.gw_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.gw_rest_api.id
  stage_name    = "\${var.stage}"
}\n\n`

    Fs.writeFileSync(main_tf_path, content)
  }
}

function empty (o: any) {
  return null == o ? true : 0 === Object.keys(o).length
}

// Strip inital newline
function TM (str: string) {
  return str.replace(/^\n/, '')
}

export { EnvLambda }
