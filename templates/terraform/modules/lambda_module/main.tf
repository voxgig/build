variable "function_name" {
  type = string
}

variable "handler" {
  type = string
}

variable "runtime" {
  type    = string
  default = "nodejs16.x"
}

variable "role_arn" {
  type = string
}

variable "s3_bucket" {
  type = string
}

variable "s3_key" {
  type = string
}

variable "memory_size" {
  type    = number
  default = 1024
}

variable "timeout" {
  type    = number
  default = 99
}

variable "retention_in_days" {
  type    = number
  default = 30
}

variable "environment" {
  type = map(string)
  default = {
    STAGE = "tf01"
  }
}

# Lambda function
resource "aws_lambda_function" "lambda" {
  function_name = var.function_name
  handler       = var.handler
  runtime       = var.runtime
  s3_bucket     = var.s3_bucket
  s3_key        = var.s3_key
  role = var.role_arn

  timeout = var.timeout

  environment {
    variables = var.environment
  }

  memory_size = var.memory_size

  source_code_hash = filebase64sha256("${path.root}/../../../backend.zip")
}

# CloudWatch Log Group for the Lambda function
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.retention_in_days

  tags = {
    LambdaName = var.function_name
  }
}
