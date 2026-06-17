# Aurora PostgreSQL, Serverless v2.
#
# `random_password` generates the DB master password once and stores it in
# Terraform state. The SAME value feeds both the cluster here AND the app's
# .env (see compute.tf), so there is never a manual copy/paste of the password.

resource "random_password" "db" {
  length  = 28
  special = false # URL-safe: no escaping needed inside DATABASE_URL
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-subnets"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_rds_cluster" "this" {
  cluster_identifier   = var.project
  engine               = "aurora-postgresql"
  engine_version       = var.db_engine_version
  engine_mode          = "provisioned" # Serverless v2 runs under the "provisioned" mode
  database_name        = var.project
  master_username      = var.project
  master_password      = random_password.db.result
  db_subnet_group_name = aws_db_subnet_group.this.name

  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot    = true # demo cluster; don't snapshot on destroy

  serverlessv2_scaling_configuration {
    min_capacity = var.db_min_acu # 0 = scale-to-0
    max_capacity = var.db_max_acu
  }
}

resource "aws_rds_cluster_instance" "this" {
  identifier         = "${var.project}-1"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}
