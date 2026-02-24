locals {
  deployment_name = "${var.app_name}-${var.region_name}"
  labels = {
    app         = var.app_name
    region      = var.region_name
    environment = var.environment
  }

  env_entries = [for key, value in var.env_vars : {
    name  = key
    value = value
  }]
}

resource "kubernetes_namespace_v1" "this" {
  metadata {
    name = var.namespace
    labels = {
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

resource "kubernetes_deployment_v1" "backend" {
  metadata {
    namespace = kubernetes_namespace_v1.this.metadata[0].name
    name      = local.deployment_name
    labels    = local.labels
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = local.labels
    }

    template {
      metadata {
        labels = local.labels
      }

      spec {
        termination_grace_period_seconds = 30

        affinity {
          pod_anti_affinity {
            preferred_scheduling_ignored_during_execution {
              weight = 100
              pod_affinity_term {
                topology_key = "kubernetes.io/hostname"
                label_selector {
                  match_labels = local.labels
                }
              }
            }
          }
        }

        topology_spread_constraint {
          max_skew           = 1
          topology_key       = "topology.kubernetes.io/zone"
          when_unsatisfiable = "ScheduleAnyway"
          label_selector {
            match_labels = local.labels
          }
        }

        container {
          name              = var.app_name
          image             = var.image
          image_pull_policy = "IfNotPresent"

          port {
            container_port = var.container_port
            name           = "http"
          }

          resources {
            requests = {
              cpu    = "${var.cpu_request_millicores}m"
              memory = "${var.memory_request_mib}Mi"
            }
            limits = {
              cpu    = "${var.cpu_limit_millicores}m"
              memory = "${var.memory_limit_mib}Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = "http"
            }
            initial_delay_seconds = 20
            period_seconds        = 10
            timeout_seconds       = 2
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health/ready"
              port = "http"
            }
            initial_delay_seconds = 10
            period_seconds        = 10
            timeout_seconds       = 2
            failure_threshold     = 3
          }

          dynamic "env" {
            for_each = local.env_entries
            content {
              name  = env.value.name
              value = env.value.value
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "backend" {
  metadata {
    namespace = kubernetes_namespace_v1.this.metadata[0].name
    name      = "${local.deployment_name}-svc"
    labels    = local.labels
  }

  spec {
    selector = local.labels

    port {
      name        = "http"
      port        = 80
      target_port = var.container_port
      protocol    = "TCP"
    }

    type = "LoadBalancer"
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "backend" {
  metadata {
    namespace = kubernetes_namespace_v1.this.metadata[0].name
    name      = "${local.deployment_name}-hpa"
    labels    = local.labels
  }

  spec {
    min_replicas = var.replicas
    max_replicas = var.max_replicas

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.backend.metadata[0].name
    }

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = var.target_cpu_utilization
        }
      }
    }

    behavior {
      scale_up {
        stabilization_window_seconds = 30
        policy {
          type           = "Pods"
          value          = 2
          period_seconds = 30
        }
      }

      scale_down {
        stabilization_window_seconds = 120
        policy {
          type           = "Percent"
          value          = 30
          period_seconds = 60
        }
      }
    }
  }
}

resource "kubernetes_pod_disruption_budget_v1" "backend" {
  metadata {
    namespace = kubernetes_namespace_v1.this.metadata[0].name
    name      = "${local.deployment_name}-pdb"
    labels    = local.labels
  }

  spec {
    min_available = "50%"
    selector {
      match_labels = local.labels
    }
  }
}