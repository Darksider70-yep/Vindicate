variable "zone_id" {
  type = string
}

variable "account_id" {
  type = string
}

variable "hostname" {
  type = string
}

variable "deployment_mode" {
  type = string
}

variable "primary_origin" {
  type = string
}

variable "secondary_origin" {
  type = string
}

variable "health_path" {
  type = string
}

variable "health_expected_codes" {
  type = string
}

variable "failover_check_regions" {
  type = list(string)
}

variable "notification_email" {
  type = string
}

variable "session_affinity" {
  type = string
}

variable "session_affinity_ttl" {
  type = number
}