output "gw_integration_id" {
  description = "The ID of the GW integration"
  value       = aws_api_gateway_integration.gw_integration.id
}

output "gw_resource_id" {
    description = "The ID of the GW resource"
    value       = aws_api_gateway_resource.gw_resource.id
}

output "gw_method_id" {
    description = "The ID of the GW method"
    value       = aws_api_gateway_method.gw_method.id
}