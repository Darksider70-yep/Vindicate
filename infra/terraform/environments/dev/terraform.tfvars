environment      = "dev"
deployment_mode  = "active_passive"
backend_image    = "ghcr.io/vindicate/backend:dev-latest"
public_hostname  = "api-dev.vindicate.example.com"
ops_notification_email = "devops@vindicate.example.com"

primary_cluster = {
  region_name     = "us-east-1"
  kubeconfig_path = "~/.kube/config"
  kube_context    = "dev-primary"
  replicas        = 2
  max_replicas    = 4
  external_origin = "dev-primary.vindicate.example.com"
}

secondary_cluster = {
  region_name     = "us-west-2"
  kubeconfig_path = "~/.kube/config"
  kube_context    = "dev-secondary"
  replicas        = 1
  max_replicas    = 2
  external_origin = "dev-secondary.vindicate.example.com"
}