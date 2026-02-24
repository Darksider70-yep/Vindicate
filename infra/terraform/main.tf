terraform {
  required_version = ">= 1.6.0"

  backend "s3" {}

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
}

locals {
  deployment_mode = lower(var.deployment_mode)
}

module "regional_primary" {
  source = "./modules/regional_service"

  providers = {
    kubernetes = kubernetes.primary
  }

  environment            = var.environment
  region_name            = var.primary_cluster.region_name
  namespace              = var.k8s_namespace
  app_name               = var.app_name
  image                  = var.backend_image
  container_port         = var.container_port
  replicas               = var.primary_cluster.replicas
  max_replicas           = var.primary_cluster.max_replicas
  cpu_request_millicores = var.cpu_request_millicores
  memory_request_mib     = var.memory_request_mib
  cpu_limit_millicores   = var.cpu_limit_millicores
  memory_limit_mib       = var.memory_limit_mib
  target_cpu_utilization = var.target_cpu_utilization
  env_vars               = var.backend_env
  external_origin        = var.primary_cluster.external_origin
}

module "regional_secondary" {
  source = "./modules/regional_service"

  providers = {
    kubernetes = kubernetes.secondary
  }

  environment            = var.environment
  region_name            = var.secondary_cluster.region_name
  namespace              = var.k8s_namespace
  app_name               = var.app_name
  image                  = var.backend_image
  container_port         = var.container_port
  replicas               = var.secondary_cluster.replicas
  max_replicas           = var.secondary_cluster.max_replicas
  cpu_request_millicores = var.cpu_request_millicores
  memory_request_mib     = var.memory_request_mib
  cpu_limit_millicores   = var.cpu_limit_millicores
  memory_limit_mib       = var.memory_limit_mib
  target_cpu_utilization = var.target_cpu_utilization
  env_vars               = var.backend_env
  external_origin        = var.secondary_cluster.external_origin
}

module "global_dns" {
  source = "./modules/global_dns"

  providers = {
    cloudflare = cloudflare
  }

  zone_id         = var.cloudflare_zone_id
  account_id      = var.cloudflare_account_id
  hostname        = var.public_hostname
  deployment_mode = local.deployment_mode
  primary_origin  = coalesce(var.primary_cluster.external_origin, module.regional_primary.service_origin)
  secondary_origin = coalesce(
    var.secondary_cluster.external_origin,
    module.regional_secondary.service_origin
  )
  health_path             = "/health/ready"
  health_expected_codes   = "200"
  failover_check_regions  = var.failover_check_regions
  notification_email      = var.ops_notification_email
  session_affinity        = "cookie"
  session_affinity_ttl    = 1800
}
