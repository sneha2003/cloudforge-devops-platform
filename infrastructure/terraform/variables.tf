variable "project_name" {
  description = "Short lowercase name used in Azure resource names."
  type        = string
  default     = "cloudforge"
  validation {
    condition     = can(regex("^[a-z0-9-]{3,20}$", var.project_name))
    error_message = "Use 3-20 lowercase letters, digits, or hyphens."
  }
}

variable "environment" {
  description = "Deployment environment label."
  type        = string
  default     = "portfolio"
}

variable "location" {
  description = "Azure region; Germany West Central is close to the project owner."
  type        = string
  default     = "germanywestcentral"
}

variable "vm_size" {
  description = "Small development VM. Check regional availability and pricing before apply."
  type        = string
  default     = "Standard_B2s"
}

variable "admin_username" {
  description = "Non-root Linux administrator account."
  type        = string
  default     = "cloudforge"
}

variable "ssh_public_key" {
  description = "OpenSSH public key. Never provide a private key."
  type        = string
  sensitive   = true
}

variable "allowed_admin_cidr" {
  description = "Single trusted IPv4 CIDR allowed to use SSH, e.g. 203.0.113.10/32."
  type        = string
  validation {
    condition     = can(cidrhost(var.allowed_admin_cidr, 0)) && var.allowed_admin_cidr != "0.0.0.0/0"
    error_message = "Provide a valid restricted CIDR; world-open SSH is intentionally rejected."
  }
}

variable "vnet_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "subnet_cidr" {
  type    = string
  default = "10.42.1.0/24"
}

variable "tags" {
  description = "Additional governance and cost-allocation tags."
  type        = map(string)
  default     = {}
}

