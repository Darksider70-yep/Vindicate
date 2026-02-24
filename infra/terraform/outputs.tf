output "primary_region_service_origin" {
  description = "Primary region service origin for DNS pool"
  value       = coalesce(var.primary_cluster.external_origin, module.regional_primary.service_origin)
}

output "secondary_region_service_origin" {
  description = "Secondary region service origin for DNS pool"
  value       = coalesce(var.secondary_cluster.external_origin, module.regional_secondary.service_origin)
}

output "global_api_hostname" {
  description = "Public global API endpoint"
  value       = module.global_dns.hostname
}

output "deployment_mode" {
  description = "Current global traffic strategy"
  value       = lower(var.deployment_mode)
}