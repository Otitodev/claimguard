# ClaimGuard Infrastructure (Terraform)

This folder is the **entire AWS backend stack as code** — the same thing that was
built by hand (Aurora + EC2 + Caddy/HTTPS), written so it can be recreated with a
couple of commands and torn down just as easily.

> Status: **source-of-truth artifact.** The live API it describes is up at
> **`https://apiclaimguard.otito.site`** (`/health` → ok). That stack was built by
> hand; this Terraform documents it and can stand up a fresh, parallel one. It has
> **not** been `apply`-ed or `import`-ed against the hand-built resources, so
> running it creates a *separate* stack.

---

## Terraform in 60 seconds (you've never used it — start here)

**The idea:** instead of clicking around the AWS console (or running `aws` CLI
commands one by one), you *describe the end state you want* in `.tf` files.
Terraform figures out what to create, change, or delete to match. Run it again
and nothing changes (it's **idempotent**). Delete everything with one command.

**The vocabulary:**

| Term | What it means here |
|------|--------------------|
| **resource** | A thing Terraform creates, e.g. `aws_instance` (the EC2 box), `aws_rds_cluster` (Aurora). |
| **data source** | A *read-only lookup* of something that already exists, e.g. your default VPC or the latest AMI. Creates nothing. |
| **variable** | An input (region, domain, API keys). Set in `terraform.tfvars`. |
| **output** | A value printed when done (the Elastic IP, the DB endpoint). |
| **provider** | The plugin that talks to a platform — here, `aws`. |
| **state** | A file (`terraform.tfstate`) Terraform writes to remember what it created. **It can contain secrets — never commit it** (our `.gitignore` blocks it). |
| **`templatefile()`** | Renders a template (our `bootstrap.sh.tftpl`) with real values plugged in. |

**The workflow (always these three):**

```bash
terraform init     # download the aws/random/archive plugins (run once)
terraform plan     # DRY RUN: shows exactly what it will create/change. Changes nothing.
terraform apply    # actually do it (asks "yes?" first)
# ...later...
terraform destroy  # delete the whole stack (great for cost control)
```

`plan` is your safety net: it prints a diff (`+` create, `~` change, `-` destroy)
and does nothing until you run `apply`. Read it before saying yes.

---

## What this stack builds

```
                you point DNS here ─┐
                                    ▼
   Internet ──HTTPS──▶  api_domain (A record ──▶ aws_eip)
                                    │
                                    ▼
                        aws_instance "app"  (EC2 t4g.small, eu-north-1)
                          ├─ Caddy        → auto Let's Encrypt cert, reverse proxy
                          └─ uvicorn       → FastAPI on 127.0.0.1:8000  (systemd)
                                    │  private VPC traffic only
                                    ▼
                        aws_rds_cluster "this"  (Aurora Serverless v2, scale-to-0)
```

| File | What's in it |
|------|--------------|
| `versions.tf` | Required Terraform + provider versions. |
| `main.tf` | The `aws` provider and the read-only lookups (default VPC, subnets, AMI). |
| `variables.tf` | All inputs, each documented. |
| `security.tf` | Two firewalls: app (SSH from you, 80/443 public) and db (5432 from app **only**). |
| `database.tf` | Aurora cluster + instance, and the auto-generated DB password. |
| `compute.tf` | Zips `backend/` → S3 → EC2 + IAM + Elastic IP. |
| `bootstrap.sh.tftpl` | cloud-init: the in-the-box setup (Python 3.12, deps, `.env`, systemd, Caddy). |
| `outputs.tf` | Elastic IP, API URL, DB endpoint/password. |
| `terraform.tfvars.example` | Template for your secrets. |

### How the code gets onto the box
`archive_file` zips `../backend` → `aws_s3_object` uploads it to a private bucket
→ the EC2 instance's IAM role lets it `s3:GetObject` that one file → cloud-init
downloads and unpacks it. No SSH needed for deployment; the instance configures
itself on first boot.

---

## How to use it

**Prereqs:** [install Terraform](https://developer.hashicorp.com/terraform/install),
have the AWS CLI configured (`aws sts get-caller-identity` works), and an SSH key
(`ssh-keygen -t ed25519` if you don't have one).

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # then edit it with your values

# Make sure the venv isn't bundled into the zip:
rm -rf ../backend/.venv

terraform init
terraform plan        # review the ~30 resources it will create
terraform apply       # type "yes"
```

When it finishes it prints `api_elastic_ip`. **Point your DNS A record**
(`api_domain`) at that IP. Caddy keeps retrying the cert, so within a few minutes
of DNS propagating, `https://<api_domain>/health` returns `{"status":"ok"}`.

Reveal the generated DB password if you need it:
```bash
terraform output -raw db_password
```

Tear it all down (stops all charges):
```bash
terraform destroy
```

---

## Important notes & caveats

- **This creates a *parallel* stack.** It does not adopt the resources already
  running. To make Terraform manage those instead, each would need
  `terraform import` (more involved) — deferred per "document only".
- **Secrets in cloud-init.** The `.env` (with API keys + DB password) is rendered
  into EC2 *user-data*, which is readable from instance metadata by anything on
  the box. Fine for a demo; for production, fetch secrets from **AWS Secrets
  Manager / SSM Parameter Store** in `bootstrap.sh.tftpl` instead of templating
  them in. State also holds these secrets — keep `terraform.tfstate` private
  (use an encrypted S3 backend for real teams).
- **Cold starts.** `db_min_acu = 0` means the first request after idle waits
  ~15–30s for Aurora to resume. Set `db_min_acu = 0.5` before a live demo to keep
  it warm.
- **DNS is manual** unless `otito.site` is on Route 53 or Cloudflare — then it
  could be a Terraform resource too (the A record → `aws_eip.app.public_ip`).
- **`archive_file` can't glob-exclude directories**, so delete `backend/.venv`
  before `apply` or it bloats the artifact.
