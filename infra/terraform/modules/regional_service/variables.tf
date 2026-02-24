variable "environment" {
  type = string
}

variable "region_name" {
  type = string
}

variable "namespace" {
  type = string
}

variable "app_name" {
  type = string
}

variable "image" {
  type = string
}

variable "container_port" {
  type = number
}

variable "replicas" {
  type = number
}

variable "max_replicas" {
  type = number
}

variable "cpu_request_millicores" {
  type = number
}

variable "memory_request_mib" {
  type = number
}

variable "cpu_limit_millicores" {
  type = number
}

variable "memory_limit_mib" {
  type = number
}

variable "target_cpu_utilization" {
  type = number
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "external_origin" {
  type      = string
  default   = null
  nullable  = true
}