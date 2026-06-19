# Inputs to the stack. Values come from terraform.tfvars (gitignored) or
# TF_VAR_* environment variables. Anything without a `default` is required.

variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "eu-north-1"
}

variable "project" {
  description = "Name prefix used for all resources."
  type        = string
  default     = "claimguard"
}

variable "api_domain" {
  description = "Public hostname for the API. You point an A record at the Elastic IP output; Caddy issues a Let's Encrypt cert for this name."
  type        = string
  # example: apiclaimguard.otito.site
}

variable "admin_cidr" {
  description = "CIDR range allowed to SSH into the box. Use your public IP with /32 (e.g. 102.90.103.36/32)."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key contents (the .pub file) used for EC2 access."
  type        = string
}

variable "instance_type" {
  description = "EC2 size. t4g.small = 2 vCPU / 2GB (Graviton/arm64)."
  type        = string
  default     = "t4g.small"
}

variable "db_engine_version" {
  description = "Aurora PostgreSQL engine version (must support Serverless v2 scale-to-0)."
  type        = string
  default     = "16.9"
}

variable "db_min_acu" {
  description = "Aurora Serverless v2 minimum capacity. 0 = scale-to-0 (cheapest; first request after idle is slow). 0.5 = always warm (no cold starts), ~$0.06/hr."
  type        = number
  default     = 0
}

variable "db_max_acu" {
  description = "Aurora Serverless v2 maximum capacity (ACUs)."
  type        = number
  default     = 1
}

variable "anthropic_api_key" {
  description = "Anthropic API key for the LLM pipeline."
  type        = string
  sensitive   = true
}

variable "agentmail_api_key" {
  description = "AgentMail API key for email-in (optional)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "better_auth_url" {
  description = "Frontend origin that issues JWTs (your Vercel URL). The backend verifies the token issuer and fetches JWKS from here, so it must be the live frontend URL."
  type        = string
  default     = "http://localhost:3000"
}

variable "cors_origins" {
  description = "Comma-separated allowed CORS origins for the API."
  type        = string
  default     = "http://localhost:3000,http://127.0.0.1:3000"
}
