output "hostname" {
  value       = cloudflare_load_balancer.global.name
  description = "Global API hostname"
}

output "primary_pool_id" {
  value       = cloudflare_load_balancer_pool.primary.id
  description = "Primary pool ID"
}

output "secondary_pool_id" {
  value       = cloudflare_load_balancer_pool.secondary.id
  description = "Secondary pool ID"
}

output "monitor_id" {
  value       = cloudflare_load_balancer_monitor.api.id
  description = "Health monitor ID"
}