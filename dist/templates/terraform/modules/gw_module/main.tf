variable "function_name" {
  type = string
}

variable "rest_api_id" {
  type = string
}

variable "parent_id" {
  type = string
}

variable "path_part" {
  type = string
}

variable "http_method" {
  type    = string
  default = "POST"
}

variable "authorization" {
  type    = string
  default = "NONE"
}

variable "invoke_arn" {
  type = string
}

variable "integration_http_method" {
  type    = string
  default = "POST"
}

resource "aws_lambda_permission" "allow_lambda" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_api_gateway_resource" "gw_resource" {
  rest_api_id = var.rest_api_id
  parent_id   = var.parent_id
  path_part   = var.path_part
}
resource "aws_api_gateway_method" "gw_method" {
  http_method   = var.http_method
  authorization = var.authorization
  resource_id   = aws_api_gateway_resource.gw_resource.id
  rest_api_id   = var.rest_api_id
}
resource "aws_api_gateway_integration" "gw_integration" {
  http_method             = aws_api_gateway_method.gw_method.http_method
  resource_id             = aws_api_gateway_resource.gw_resource.id
  rest_api_id             = var.rest_api_id
  type                    = "AWS_PROXY"
  uri                     = var.invoke_arn
  integration_http_method = var.integration_http_method
}
