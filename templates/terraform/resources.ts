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

export const dynamodb_table = (
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
}`

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
