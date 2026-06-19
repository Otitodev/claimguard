# Firewall rules (security groups).
#
# Two groups, mirroring the hand-built stack:
#   - app: the API server. SSH only from you; 80/443 open to the world so the
#     public can reach the API and Caddy can complete the Let's Encrypt challenge.
#   - db:  Aurora. Postgres (5432) reachable ONLY from the app security group,
#     never from the public internet — the database has no public exposure.

resource "aws_security_group" "app" {
  name        = "${var.project}-app"
  description = "ClaimGuard API server"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from admin only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  ingress {
    description = "HTTP (Caddy ACME challenge + HTTPS redirect)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS API"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name        = "${var.project}-db"
  description = "ClaimGuard Aurora — private to the app SG"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Postgres from app servers only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
