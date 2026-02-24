variable "environment" {
  description = "Deployment environment: dev, staging, prod"
  type        = string
}

variable "deployment_mode" {
  description = "active_passive or active_active"
  type        = string
  validation {
    condition     = contains(["active_passive", "active_active"], lower(var.deployment_mode))
    error_message = "deployment_mode must be active_passive or active_active"
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "vindicate-backend"
}

variable "k8s_namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "vindicate"
}

variable "backend_image" {
  description = "Container image for backend deployment"
  type        = string
}

variable "container_port" {
  description = "Backend container port"
  type        = number
  default     = 4000
}

variable "cpu_request_millicores" {
  description = "CPU request in millicores"
  type        = number
  default     = 300
}

variable "memory_request_mib" {
  description = "Memory request in MiB"
  type        = number
  default     = 512
}

variable "cpu_limit_millicores" {
  description = "CPU limit in millicores"
  type        = number
  default     = 1000
}

variable "memory_limit_mib" {
  description = "Memory limit in MiB"
  type        = number
  default     = 1024
}

variable "target_cpu_utilization" {
  description = "HPA target average CPU utilization percentage"
  type        = number
  default     = 70
}

variable "backend_env" {
  description = "Environment variables injected into backend pods"
  type        = map(string)
  default     = {}
}

variable "primary_cluster" {
  description = "Primary region cluster details"
  type = object({
    region_name     = string
    kubeconfig_path = string
    kube_context    = string
    replicas        = number
    max_replicas    = number
    external_origin = optional(string)
  })
}

variable "secondary_cluster" {
  description = "Secondary region cluster details"
  type = object({
    region_name     = string
    kubeconfig_path = string
    kube_context    = string
    replicas        = number
    max_replicas    = number
    external_origin = optional(string)
  })
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "public_hostname" {
  description = "Public DNS hostname for global API endpoint"
  type        = string
}

variable "ops_notification_email" {
  description = "Ops alert email for health monitor failures"
  type        = string
}

variable "failover_check_regions" {
  description = "Cloudflare monitor regions used for global failover checks"
  type        = list(string)
  default     = ["WEU", "ENAM", "WNAM"]
}
