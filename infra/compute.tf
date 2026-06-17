# The API server + how its code gets there.
#
# Flow:
#   1. archive_file zips backend/ into a .zip.
#   2. That zip is uploaded to a private S3 bucket.
#   3. The EC2 instance gets an IAM role allowing it to download that one object.
#   4. cloud-init (bootstrap.sh.tftpl) runs on first boot: pulls the zip, installs
#      Python 3.12 + deps, writes .env, inits the DB, and starts uvicorn + Caddy.
#   5. An Elastic IP gives the box a stable address for your DNS record.

resource "aws_key_pair" "this" {
  key_name   = "${var.project}-ec2"
  public_key = var.ssh_public_key
}

# --- Package the backend and stage it in S3 -------------------------------
# NOTE: ensure backend/.venv does not exist when you run apply (archive_file
# cannot glob-exclude a whole directory tree); delete it first if present.
data "archive_file" "backend" {
  type        = "zip"
  source_dir  = "${path.module}/../backend"
  output_path = "${path.module}/.artifacts/backend.zip"
  excludes    = [".env", "time_upload.py"]
}

resource "aws_s3_bucket" "artifacts" {
  bucket_prefix = "${var.project}-artifacts-"
  force_destroy = true
}

resource "aws_s3_object" "backend" {
  bucket = aws_s3_bucket.artifacts.id
  key    = "backend-${data.archive_file.backend.output_md5}.zip"
  source = data.archive_file.backend.output_path
  etag   = data.archive_file.backend.output_md5
}

# --- IAM: let the instance read the artifact from S3 ----------------------
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${var.project}-app"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "s3_read" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
  }
}

resource "aws_iam_role_policy" "s3_read" {
  name   = "${var.project}-s3-read"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.s3_read.json
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.project}-app"
  role = aws_iam_role.app.name
}

# --- The EC2 instance -----------------------------------------------------
resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023_arm64.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.this.key_name
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name

  root_block_device {
    volume_size = 16
    volume_type = "gp3"
  }

  # cloud-init: everything that configures the box, rendered with real values.
  user_data = templatefile("${path.module}/bootstrap.sh.tftpl", {
    region            = var.region
    artifact_bucket   = aws_s3_bucket.artifacts.id
    artifact_key      = aws_s3_object.backend.key
    db_url            = "postgresql+psycopg://${var.project}:${random_password.db.result}@${aws_rds_cluster.this.endpoint}:5432/${var.project}?sslmode=require"
    anthropic_api_key = var.anthropic_api_key
    agentmail_api_key = var.agentmail_api_key
    better_auth_url   = var.better_auth_url
    cors_origins      = var.cors_origins
    api_domain        = var.api_domain
  })

  # Re-run cloud-init if the bootstrap inputs change (new code, new env, etc).
  user_data_replace_on_change = true

  tags = { Name = "${var.project}-api" }

  depends_on = [aws_rds_cluster_instance.this]
}

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
}
