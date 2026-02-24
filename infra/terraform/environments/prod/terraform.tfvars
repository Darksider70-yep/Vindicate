environment      = "production"
deployment_mode  = "active_active"
backend_image    = "ghcr.io/vindicate/backend:prod-latest"
public_hostname  = "api.vindicate.example.com"
ops_notification_email = "incident@vindicate.example.com"

primary_cluster = {
  region_name     = "us-east-1"
  kubeconfig_path = "~/.kube/config"
  kube_context    = "prod-primary"
  replicas        = 6
  max_replicas    = 20
  external_origin = "prod-primary.vindicate.example.com"
}

secondary_cluster = {
  region_name     = "eu-west-1"
  kubeconfig_path = "~/.kube/config"
  kube_context    = "prod-secondary"
  replicas        = 4
  max_replicas    = 16
  external_origin = "prod-secondary.vindicate.example.com"
}