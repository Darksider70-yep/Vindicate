locals {
  lb_hostname = try(kubernetes_service_v1.backend.status[0].load_balancer[0].ingress[0].hostname, null)
  lb_ip       = try(kubernetes_service_v1.backend.status[0].load_balancer[0].ingress[0].ip, null)

  computed_origin = coalesce(local.lb_hostname, local.lb_ip)
  service_origin  = coalesce(var.external_origin, local.computed_origin)
}

output "service_name" {
  value       = kubernetes_service_v1.backend.metadata[0].name
  description = "Kubernetes service name"
}

output "service_origin" {
  value       = local.service_origin
  description = "Origin hostname or IP used by global DNS pool"
}

output "deployment_name" {
  value       = kubernetes_deployment_v1.backend.metadata[0].name
  description = "Kubernetes deployment name"
}