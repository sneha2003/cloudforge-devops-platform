# Terraform explained

Terraform turns infrastructure into declarative code. Instead of manually clicking through Azure, the desired network, firewall, IP, and VM live in version control. `terraform plan` compares desired and existing state; `apply` performs the reviewed changes.

CloudForge definitions are in `infrastructure/terraform`:

- `versions.tf` pins Terraform/provider compatibility.
- `variables.tf` documents and validates inputs.
- `main.tf` defines the resource group, VNet, subnet, NSG, NIC, public IP, and Ubuntu VM.
- `outputs.tf` returns identifiers needed by operators and CI.
- `terraform.tfvars.example` is a secret-free template.

Terraform state can contain sensitive infrastructure details. It is ignored by Git. For actual team use, create a private Azure Storage account with blob versioning, locking, and restricted access, then pass backend settings to `terraform init -backend-config=...`. Do not put access keys in repository files.

Safe sequence: `terraform fmt -check -recursive`, `terraform init`, `terraform validate`, and `terraform plan`. CloudForge never automatically applies or destroys paid infrastructure. Inspect provider release notes before dependency upgrades.

