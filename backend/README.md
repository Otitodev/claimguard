# ClaimGuard — Backend + Pipeline Core

FastAPI + LangGraph backend that ingests EOB/denial PDFs, extracts and
classifies the denial, drafts an appeal when warranted, and serves analytics /
claims / needs-action endpoints. (Code comments reference design-doc sections as
`TRD §N`; the design doc itself is kept internal and not part of this repo.)

All commands below are run from this `backend/` directory.

## 1. Start Postgres

```bash
# from the repo root
docker compose up -d
```

## 2. Python env

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env        # then set ANTHROPIC_API_KEY for live LLM calls
```

`.env` keys: `DATABASE_URL`, `LLM_PROVIDER` (default `anthropic`), `LLM_MODEL`
(default `claude-opus-4-8`), `ANTHROPIC_API_KEY`, `AGENTMAIL_WEBHOOK_SECRET`.
Swap `LLM_PROVIDER`/`LLM_MODEL` to route the same pipeline through another
backend (e.g. `bedrock`) — the provider abstraction (`app/llm/`) handles it.

## 3. Create schema + seed demo data

```bash
python seed.py            # create tables + seed a demo practice & denial history
python seed.py --reset    # drop everything and reseed
```

`seed.py` prints the `practice_id` — copy it for the calls below. (Or hit
`GET /practices`.) Aurora deploys can instead apply `schema.sql`.

## 4. Sample EOB PDFs

```bash
python -m scripts.generate_sample_eobs   # writes PDFs into backend/samples/
```

## 5. Run the API

```bash
uvicorn app.main:app --reload
```

Interactive docs at http://localhost:8000/docs.

## 6. Exercise it

```bash
PRACTICE=$(curl -s localhost:8000/practices | python -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

curl -F practice_id=$PRACTICE -F file=@samples/appeal_eob.pdf \
  http://localhost:8000/claims/upload          # → extracted + classified + drafted

curl "localhost:8000/analytics/summary?practice_id=$PRACTICE"
curl "localhost:8000/claims?practice_id=$PRACTICE"
curl "localhost:8000/denials/needs-action?practice_id=$PRACTICE"
```

A second identical upload is idempotent (no duplicate denial).

## 7. Tests

```bash
pytest                 # pipeline + persistence + API, using a fake LLM (no key)
pytest -m live         # optional: real Anthropic PDF extraction (needs ANTHROPIC_API_KEY)
```

Tests use the Docker Postgres (PG-specific column types), so it must be running.

## 8. AgentMail email-in (optional — TRD §5)

Inbound denial emails flow through the same pipeline as manual upload. The
integration is fully built and mock-tested; going live needs an AgentMail
account and a public tunnel so their servers can reach this backend.

1. Set `AGENTMAIL_API_KEY` in `.env`.
2. Start a public tunnel to the backend and set `PUBLIC_BASE_URL`:
   ```bash
   ngrok http 8000            # copy the https URL
   # in .env:  PUBLIC_BASE_URL=https://<your-subdomain>.ngrok-free.app
   ```
3. Provision an inbox + webhook for a practice:
   ```bash
   python provision_agentmail.py            # uses the first seeded practice
   ```
   It creates a dedicated inbox, stores `agentmail_inbox_id` on the practice,
   registers a `message.received` webhook at `PUBLIC_BASE_URL/webhooks/agentmail`,
   and prints the signing secret.
4. Put the printed secret in `.env` as `AGENTMAIL_WEBHOOK_SECRET` and restart the
   backend (so inbound webhooks are Svix-verified).
5. Email a PDF EOB to the inbox address. The webhook verifies the signature,
   downloads the attachment, maps the inbox → practice, and runs the pipeline.
   The claim appears in the dashboard.

Without a secret set, the handler skips signature verification (dev only). The
webhook path is unit-tested with mocks (`tests/test_webhooks.py`).

## 9. Aurora deploy (AWS free-tier IAM path — alternative)

> The **primary** production deployment is the Terraform stack in [`../infra/`](../infra/):
> EC2 (Caddy + uvicorn) → **Aurora Serverless v2 with standard password auth** in a private
> VPC, live at `https://apiclaimguard.otito.site`. That path leaves `DB_IAM_AUTH=false` and
> just points `DATABASE_URL` at the cluster (`sslmode=require`) — see the root `README.md`
> "Deployment (AWS)". This section documents the **free-tier alternative** below.

The same backend also runs against Amazon Aurora on the **AWS free-tier plan**, where Aurora
must be created with *express configuration*, which behaves very differently from a standard
cluster — `app/db.py` handles those differences behind the `DB_IAM_AUTH` flag (local Docker is
unaffected when it's `false`).

**Provision** (one CLI call; free tier requires `--with-express-configuration`):

```bash
aws rds create-db-cluster \
  --db-cluster-identifier my-aurora-postgres-cluster \
  --engine aurora-postgresql \
  --master-username dbadmin \
  --with-express-configuration
# wait for: aws rds describe-db-clusters --db-cluster-identifier my-aurora-postgres-cluster \
#             --query "DBClusters[0].Status"  ->  "available"
```

What express configuration means (and how the backend copes):

- **No VPC / security group / public-access flag.** Access is via a managed
  **internet access gateway** — publicly reachable, no bastion/VPN. The endpoint
  resolves through a `*.rdsrelay.alameda.aws.dev` CNAME that some local/ISP
  resolvers fail to resolve, so set `DB_DNS_SERVERS=8.8.8.8,1.1.1.1` and the app
  resolves it via public DNS and connects by IP (with the hostname kept for TLS
  SNI, which the gateway routes on).
- **IAM authentication only** — no master password, no Secrets Manager. Every
  new connection uses a freshly minted ~15-min RDS IAM token as the password
  over TLS. The IAM principal needs `rds-db:connect`, e.g.
  `arn:aws:rds-db:<region>:<account>:dbuser:<cluster-resource-id>/dbadmin`
  (get the resource id from `describe-db-clusters ... DbClusterResourceId`).
- **The gateway cycles connections** (idle reaping without a clean TCP reset),
  so the engine uses `NullPool` — a fresh, freshly-tokened connection per
  request with a connect-retry for transient resets. Reliable, but expect a
  few seconds per request (full cross-Region TLS connect each time).

**Point the backend at Aurora** — in `.env`:

```bash
DB_IAM_AUTH=true
DB_HOST=<cluster-writer-endpoint>   # describe-db-clusters ... Endpoint
DB_USER=dbadmin
DB_NAME=postgres
AWS_REGION=<region>                 # e.g. eu-north-1
DB_DNS_SERVERS=8.8.8.8,1.1.1.1
```

AWS credentials must be configured (`aws configure`) so boto3 can sign tokens —
token generation is local SigV4, no extra network call. `boto3` and `dnspython`
are in `requirements.txt`.

**Create schema + seed, then run** (same commands, now targeting Aurora):

```bash
python seed.py --reset      # create_all + seed against Aurora
uvicorn app.main:app
```

`pytest` always runs against the local Docker Postgres regardless of
`DB_IAM_AUTH` (pinned in `tests/conftest.py`), so the suite stays fast and never
touches the cluster.

Free-tier limits: ≤ 4 ACU and ≤ 1 GB storage per cluster, max 2 clusters / 2
instances, IAM-auth only, and the VPC-only features (RDS Proxy, Data API with
password auth, Query Editor) are unavailable.

## Layout

- `app/llm/` — provider abstraction + extract / classify / draft
- `app/pipeline/` — LangGraph state, nodes, graph (`run_pipeline`)
- `app/services/` — persistence + analytics + `agentmail_client` (inbox/webhook/
  attachment)
- `app/api/` — FastAPI routers (incl. `webhooks.py` — Svix verify + pipeline)
- `provision_agentmail.py` — go-live: create inbox + register webhook
- `schema.sql` — canonical DDL (Aurora); `app/models.py` mirrors it for dev

## Out of scope (this build)

Next.js frontend lives in `../frontend`. App-level user auth is not built (the
Aurora connection itself uses AWS IAM auth — see §9). AgentMail integration is
built and mock-tested; only a live account + tunnel are needed to connect it
(see §8).
