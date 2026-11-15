output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "vm_name" {
  value = azurerm_linux_virtual_machine.app.name
}

output "public_ip_address" {
  value = azurerm_public_ip.app.ip_address
}

output "ssh_command" {
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.app.ip_address}"
  description = "Only works from allowed_admin_cidr. Prefer Azure Run Command for CI/CD."
}

output "managed_identity_principal_id" {
  value = azurerm_linux_virtual_machine.app.identity[0].principal_id
}

