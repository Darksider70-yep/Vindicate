locals {
  active_active = lower(var.deployment_mode) == "active_active"
}

resource "cloudflare_load_balancer_monitor" "api" {
  account_id     = var.account_id
  description    = "Vindicate API health monitor"
  type           = "https"
  method         = "GET"
  path           = var.health_path
  expected_codes = var.health_expected_codes
  timeout        = 5
  interval       = 30
  retries        = 2
  regions        = var.failover_check_regions
  notify_email   = var.notification_email
}

resource "cloudflare_load_balancer_pool" "primary" {
  account_id  = var.account_id
  name        = "vindicate-primary-pool"
  description = "Primary regional backend pool"
  monitor     = cloudflare_load_balancer_monitor.api.id

  origins {
    name    = "primary"
    address = var.primary_origin
    enabled = true
    weight  = 1
  }
}

resource "cloudflare_load_balancer_pool" "secondary" {
  account_id  = var.account_id
  name        = "vindicate-secondary-pool"
  description = "Secondary regional backend pool"
  monitor     = cloudflare_load_balancer_monitor.api.id

  origins {
    name    = "secondary"
    address = var.secondary_origin
    enabled = true
    weight  = 1
  }
}

resource "cloudflare_load_balancer" "global" {
  zone_id          = var.zone_id
  name             = var.hostname
  fallback_pool_id = cloudflare_load_balancer_pool.secondary.id
  default_pool_ids = local.active_active
    ? [cloudflare_load_balancer_pool.primary.id, cloudflare_load_balancer_pool.secondary.id]
    : [cloudflare_load_balancer_pool.primary.id]

  proxied              = true
  session_affinity     = var.session_affinity
  session_affinity_ttl = var.session_affinity_ttl
  steering_policy      = local.active_active ? "dynamic_latency" : "off"
}