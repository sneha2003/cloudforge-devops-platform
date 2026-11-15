# Optional Azure deployment

This path requires an Azure subscription and can cost money. It has not been verified until the owner performs it in a real account and records the result. Check the current Azure pricing calculator before proceeding.

## 1. Prepare access

Install Azure CLI and Terraform. Sign in with `az login`. Generate an SSH key if needed; put only its public half in `terraform.tfvars`. Find your current public IP and use a `/32` CIDR. The configuration rejects world-open SSH.

## 2. Review infrastructure

Copy `terraform.tfvars.example` to the ignored `terraform.tfvars`, update values, then run init, format, validate, and plan commands from the README. Review every planned resource. `Standard_B2s` is a starting point, not a price guarantee; regional availability varies.

## 3. Apply only with explicit approval

If the plan and cost are acceptable, manually run `terraform apply cloudforge.tfplan`. Cloud-init installs Docker and prepares `/opt/cloudforge`. Copy the repository release bundle into that directory and create a root-owned `.env` readable by the `cloudforge` group. Point two DNS A records at the Terraform public IP: one for WorkBoard and one for CloudForge. Set `WORKBOARD_DOMAIN`, `CLOUDFORGE_DOMAIN`, and `ACME_EMAIL`, then start with `docker compose -f compose.yaml -f compose.azure.yaml up -d`. Caddy provisions HTTPS for both sites while keeping Grafana and Prometheus private.

## 4. Configure GitHub OIDC

Create a Microsoft Entra application/federated credential limited to this repository and the `production` environment. Grant only the rights needed to invoke VM Run Command on the target resource group. Save non-secret IDs as GitHub environment variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, and `AZURE_VM_NAME`. Add required reviewers. OIDC avoids a long-lived client secret.

If GHCR packages are private, arrange a short-lived registry credential on the host through a secret manager; never put it in `terraform.tfvars`, command output, or repository files. Public portfolio packages avoid that secret but expose image contents.

## 5. Deploy and verify

Manually dispatch **Deploy to Azure VM** with the exact `:sha-...` WorkBoard image. Inspect Run Command output, WorkBoard readiness, CloudForge dashboard behavior, the deployment record, Prometheus targets, and Grafana panels. Capture the date and outcome in a validation report.

## HTTPS and hardening

The Caddy overlay uses ports 80/443 for certificate bootstrap and redirects HTTP to HTTPS. The repository does not pretend a certificate exists without a real DNS name. Restrict SSH again after setup or remove the rule and use Azure Bastion/Run Command. Enable Defender recommendations, OS patching, log retention, and backups appropriate to the environment.

## Stop cost safely

`az vm deallocate` stops compute charges but disk/IP costs can remain. To remove the lab, run `terraform plan -destroy`, review it carefully, and only then `terraform destroy`. Confirm the resource group is gone in Azure. Preserve no sensitive state in Git.

