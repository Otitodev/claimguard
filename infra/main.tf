# Provider + the "lookups" (data sources) for things that already exist in AWS:
# the account's default VPC, its subnets, and the newest Amazon Linux 2023 image
# for Graviton (arm64) instances. Data sources read existing infra; they create
# nothing.

provider "aws" {
  region = var.region
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Latest Amazon Linux 2023 arm64 AMI (matches the t4g / Graviton instance type).
data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }
  filter {
    name   = "state"
    values = ["available"]
  }
}
