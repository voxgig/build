export const provider = (ctx: any) => `terraform {

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
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

provider "aws" {
  region = var.region
}

variable "stage" {
  type    = string
  default = "tf02"
}\n\n`

export const dynamoGSI = (ctx: any) => `attribute {
    name = "${ctx.index.partition_key.name}"
    type = "${ctx.index.partition_key.kind}"
  }

  attribute {
    name = "${ctx.index.sort_key.name}"
    type = "${ctx.index.sort_key.kind}"
  }

  global_secondary_index {
    name               = "${ctx.index.name}"
    hash_key           = "${ctx.index.partition_key.name}"
    range_key          = "${ctx.index.sort_key.name}"
    projection_type    = "ALL"
  }`

export const dynamoTable = (
  ctx: any
) => `resource "aws_dynamodb_table" "${ctx.name}" {
    name         = "${ctx.fullname}"
    hash_key     = "${ctx.idField}"
    billing_mode = "PAY_PER_REQUEST"

    point_in_time_recovery {
      enabled = true
    }

    attribute {
      name = "${ctx.idField}"
      type = "S"
    }

    lifecycle {
      prevent_destroy = true
    }

    ${ctx.gsi}
}`

export const iamRole = (
  ctx: any
) => `\n\nresource "aws_iam_role" "lambda_exec_role" {
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

export const lambdaBucket = () => `resource "aws_s3_bucket" "lambda_bucket" {
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

export const lambdaFunc = (ctx: any) => `module "${ctx.name}_lambda" {
  source = "./modules/lambda_module"
  function_name = "vxg01-backend01-\${var.stage}-${ctx.name}"
  handler = "${ctx.prefix}/${ctx.name}${ctx.suffix}"
  role_arn = aws_iam_role.lambda_exec_role.arn
  s3_bucket = aws_s3_bucket.lambda_bucket.bucket
  s3_key = aws_s3_object.lambda_s3_object.key
  timeout = ${ctx.timeout}
}\n\n`

export const lambdaPermissions = (
  ctx: any
) => `resource "aws_lambda_permission" "allow_${ctx.name}_uploads_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = module.${ctx.name}_lambda.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.user_uploads.arn
}`

export const gwResource = (
  ctx: any
) => `resource "aws_api_gateway_resource" "${ctx.area}" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_resource.${ctx.parent}.id
  path_part   = "${ctx.area}"
}`

export const gwLambda = (ctx: any) => `module "gw_${ctx.name}_lambda" {
  source = "./modules/gw_module"
  function_name = module.${ctx.name}_lambda.function_name
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id = aws_api_gateway_resource.${ctx.resource}.id
  path_part = "${ctx.name}"
  invoke_arn = module.${ctx.name}_lambda.invoke_arn
}
`

export const gwDeployment = (
  ctx: any
) => `resource "aws_api_gateway_deployment" "gw_deployment" {

  depends_on = ${ctx.dependsOn}

  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id

  triggers = {
    redeployment = sha1(jsonencode(${ctx.triggers}))
  }

  lifecycle {
    create_before_destroy = true
  }
}\n\n`

export const gwStage = (
  ctx: any
) => `resource "aws_api_gateway_stage" "gw_stage" {
  deployment_id = aws_api_gateway_deployment.gw_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.gw_rest_api.id
  stage_name    = "\${var.stage}"
}\n\n`
