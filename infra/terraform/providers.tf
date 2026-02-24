provider "kubernetes" {
  alias          = "primary"
  config_path    = var.primary_cluster.kubeconfig_path
  config_context = var.primary_cluster.kube_context
}

provider "kubernetes" {
  alias          = "secondary"
  config_path    = var.secondary_cluster.kubeconfig_path
  config_context = var.secondary_cluster.kube_context
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}