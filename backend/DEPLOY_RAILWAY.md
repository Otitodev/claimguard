# Deploying the ClaimGuard backend to Railway (alternative host)

> The **primary, live** deployment is AWS EC2 + Caddy via Terraform
> ([`../infra/`](../infra/)), at `https://apiclaimguard.otito.site`, talking to
> Aurora Serverless v2 with password auth in a private VPC. See the root
> `README.md`. **Railway below is an alternative host** that pairs with the
> free-tier `DB_IAM_AUTH=true` Aurora path (`README.md` §9).

The backend is stateless — it talks to Aurora over the free-tier internet-access
gateway from anywhere (IAM-token auth), so it ports to Railway with no DB hosted
on Railway itself. Schema is already applied + seeded on Aurora; no migration
step is needed on deploy.

## 1. Create the service

1. New Project → **Deploy from GitHub repo** → pick this repo.
2. Service **Settings → Root Directory = `backend`** (so `railway.toml`,
   `requirements.txt`, and `.python-version` are picked up; Python pins to 3.12).
3. Build = Nixpacks (default). Start command and `/health` healthcheck come from
   `railway.toml`. Railway injects `$PORT`; uvicorn binds `0.0.0.0:$PORT`.

## 2. Service variables (Settings → Variables)

Aurora / app:
```
DB_IAM_AUTH=true
DB_HOST=my-aurora-postgres-cluster.cluster-c18uq8s4qy6z.eu-north-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=dbadmin
DB_NAME=postgres
AWS_REGION=eu-north-1
DB_DNS_SERVERS=8.8.8.8,1.1.1.1
ANTHROPIC_API_KEY=<your key>
LLM_PROVIDER=anthropic
LLM_MODEL=claude-opus-4-8
CORS_ORIGINS=https://<your-app>.vercel.app,http://localhost:3000
```

AWS credentials for boto3 (the key gotcha — Railway has no `aws configure`):
```
AWS_ACCESS_KEY_ID=<access key id>
AWS_SECRET_ACCESS_KEY=<secret>
```
The IAM principal these keys belong to needs the `rds-db:connect` action on the
cluster resource (same permission used locally). `AWS_REGION` above doubles as
boto3's region.

## 3. Verify

- `https://<service>.up.railway.app/health` → `{"status":"ok"}`
- `https://<service>.up.railway.app/practices` → the seeded practice (proves the
  Aurora IAM path works end-to-end from Railway).

First request after an idle period is slow (~5s): NullPool opens a fresh
tokened TLS connection per request, and the gateway is cross-Region. This is the
documented free-tier trade-off, not a bug.

## 4. Point the frontend at it

In Vercel set `NEXT_PUBLIC_API_URL=https://<service>.up.railway.app` and
`NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`, then redeploy. Make sure
that Vercel domain is in `CORS_ORIGINS` above.
