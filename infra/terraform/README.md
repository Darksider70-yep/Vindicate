# Terraform Multi-Region Stack

This Terraform stack deploys Vindicate backend workloads to two Kubernetes regions and configures global DNS failover through Cloudflare load-balancer pools.

## Design goals

- Support `active_passive` and `active_active` traffic strategies.
- Keep platform cloud-agnostic by targeting Kubernetes clusters (EKS/GKE/AKS compatible).
- Isolate environment configuration (`dev`, `staging`, `prod`) via environment tfvars and backend state configs.

## Structure

```text
infra/terraform/
  main.tf
  providers.tf
  variables.tf
  outputs.tf
  terraform.tfvars.example
  environments/
    dev/
      backend.hcl
      terraform.tfvars
    staging/
      backend.hcl
      terraform.tfvars
    prod/
      backend.hcl
      terraform.tfvars
  modules/
    regional_service/
      main.tf
      variables.tf
      outputs.tf
    global_dns/
      main.tf
      variables.tf
      outputs.tf
```

## Environment workflows

```bash
cd infra/terraform
terraform init -backend-config=environments/dev/backend.hcl
terraform plan -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars
```

Switch `dev` to `staging` or `prod` for those environments.

## DNS failover behavior

- `active_passive`: primary pool receives traffic; secondary is fallback only.
- `active_active`: both pools receive traffic with dynamic latency steering.
- Health monitor path defaults to `/health/ready` for failover decisions.

## Tradeoffs

- Higher reliability requires duplicate regional capacity and therefore higher baseline cost.
- Active-active lowers failover time but increases operational complexity and consistency requirements.
- Active-passive is cheaper and simpler but has slower warm-up during failover events.