environment      = "staging"
deployment_mode  = "active_active"
backend_image    = "ghcr.io/vindicate/backend:staging-latest"
public_hostname  = "api-staging.vindicate.example.com"
ops_notification_email = "soc@vindicate.example.com"

primary_cluster = {
  region_name     = "us-east-1"
  kubeconfig_path = "~/.kube/config"
  kube_context    = "staging-primary"
  replicas        = 3
  max_replicas    = 8
  external_origin = "staging-primary.vindicate.example.com"
}

secondary_cluster = {
  region_name     = "eu-west-1"
  kubeconfig_path = "~/.kube/config"
  kube_context    = "staging-secondary"
  replicas        = 3
  max_replicas    = 8
  external_origin = "staging-secondary.vindicate.example.com"
}