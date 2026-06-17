# Values printed after `terraform apply` (and readable via `terraform output`).

output "api_elastic_ip" {
  description = "Point your api_domain A record at this address."
  value       = aws_eip.app.public_ip
}

output "api_url" {
  description = "The HTTPS API base URL (works once DNS + cert are live)."
  value       = "https://${var.api_domain}"
}

output "db_endpoint" {
  description = "Aurora writer endpoint."
  value       = aws_rds_cluster.this.endpoint
}

output "db_password" {
  description = "Generated DB master password (hidden; reveal with: terraform output -raw db_password)."
  value       = random_password.db.result
  sensitive   = true
}
