terraform {
  required_version = ">= 1.8.0, < 2.0.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.21"
    }
  }
  # For team use, configure an azurerm backend at init time. State must never be committed.
}

provider "azurerm" {
  features {}
}

