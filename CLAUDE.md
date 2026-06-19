# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ClaimGuard is a B2B SaaS tool that automates insurance claim-denial processing for small
medical practices: ingest an EOB/denial PDF → extract & classify the denial → draft an
appeal letter when warranted → surface analytics / claims / needs-action. `claimgaurd_TRD.md`
is the source-of-truth design doc; its section numbers (TRD §N) are referenced throughout the
code. The repo has two independent parts: `backend/` (FastAPI + LangGraph + Postgres) and
`frontend/` (Next.js 16 dashboard).

## Commands

Backend — run from `backend/`. The venv uses **Python 3.12** (deps lack 3.14 wheels; create
with `py -3.12 -m venv .venv`):

```bash
docker compose up -d                      # Postgres (from repo root); required for app + tests
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe seed.py          # create tables + seed demo practice; --reset to wipe & reseed
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000   # API at :8000, docs at /docs
.venv\Scripts\python.exe -m pytest -q                # full suite (uses a fake LLM, no API key)
.venv\Scripts\python.exe -m pytest -q -m "not live"  # skip the real-Anthropic integration test
.venv\Scripts\python.exe -m pytest tests/test_pipeline.py::test_name   # single test
```

`seed.py` prints the `practice_id` the frontend/curl calls need (or hit `GET /practices`).
Tests require the Docker Postgres running (they use PG-specific column types).

Frontend — run from `frontend/` (Node 22):

```bash
npm run dev          # :3000
npm run build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

## Backend architecture

**Provider abstraction (avoid LLM vendor lock-in).** All model access goes through
`app/llm/provider.py::get_chat_model()`, which builds `init_chat_model(LLM_MODEL,
model_provider=LLM_PROVIDER)`. Swap provider/model via env with no code change. PDF-specific
logic is isolated in `app/llm/extract.py` (Claude native document block, with a pdfplumber
text fallback). `classify.py`/`extract.py` use `.with_structured_output(<PydanticModel>)`;
the schemas they bind to (`ExtractedEOB`, `DenialClassification`) live in `app/schemas.py`.

**The pipeline is the heart.** `app/pipeline/graph.py::run_pipeline()` is the single
entrypoint shared by the manual-upload endpoint (`api/claims.py`) and the AgentMail webhook
(`api/webhooks.py`). It's a LangGraph `StateGraph`: parse_eob → resolve_patient_and_payer →
match_or_create_claim → classify_denial → (conditional: draft_appeal if classification ==
"appeal") → persist, then `session.commit()`. The graph is **rebuilt per request** so node
closures can capture the request-scoped SQLAlchemy session (`build_graph(session, llm)`);
nodes are factory functions (`make_*`) in `nodes.py`. State shape is `pipeline/state.py`.

**Persistence is idempotent.** `app/services/persistence.py` does match-or-create for
patient/payer/claim and guards duplicate denials on `(claim_id, denial_code, denial_date)`,
so re-uploading the same EOB does not create duplicates. Appeal deadline = denial_date +
`payers.appeal_window_days`. All lifecycle steps write `activity_log` rows.

**Dual database modes behind `DB_IAM_AUTH` (`app/db.py`).** `false` (default) → plain
`DATABASE_URL` with normal pooling. This is both **local Docker Postgres** in dev and the
**production Aurora Serverless v2** (password auth, private VPC, `sslmode=require`) — the live
deploy on EC2 uses this path (`infra/bootstrap.sh.tftpl` writes `DB_IAM_AUTH=false` +
`DATABASE_URL`). `true` → the **free-tier alternative**: Aurora "express configuration", which
has no VPC/password and uses **IAM token auth** over a public internet-access gateway: the
engine mints a fresh RDS IAM token per connection (boto3), resolves the gateway endpoint via
public DNS (dnspython, since its `.aws.dev` zone defeats some local resolvers) and connects by
IP with the hostname kept for TLS SNI, and uses **NullPool** (the gateway reaps idle
connections without a clean reset, which hangs normal pooling). Full IAM runbook:
`backend/README.md` §9. `schema.sql` is the canonical DDL; `app/models.py` mirrors it;
`init_db()` runs `create_all` plus idempotent additive `_MIGRATIONS`.

**Deployment.** Production is **infrastructure-as-code in `infra/`** (Terraform + cloud-init):
EC2 (Caddy auto-HTTPS + uvicorn under systemd) → Aurora Serverless v2 in a private VPC. Live at
`https://apiclaimguard.otito.site`. Railway (`backend/DEPLOY_RAILWAY.md`) is a documented
alternative host that pairs with the `DB_IAM_AUTH=true` free-tier Aurora path.

**API layer.** Routers in `app/api/` (claims, appeals, denials, analytics, webhooks) registered
in `main.py`, which also has CORS for the :3000 frontend and meta routes `/health` + `/practices`.
Response shaping is in `api/serializers.py`; aggregation queries in `services/analytics.py`.
Money fields are `Decimal` and serialize to JSON **strings**.

## Frontend architecture

Next.js 16 App Router (RSC) + Tailwind v4 + shadcn/ui (preset `b5KcMrk3P`, luma style) with
**hugeicons** (not lucide) and the Geist font. Route groups: `app/(app)/` is the authed
dashboard (dashboard, claims, claims/[id], needs-action, upload) behind a shared sidebar
layout; `app/(marketing)/` is the public landing page. Server components fetch through
`lib/api.ts` (`api.*` helpers) against `NEXT_PUBLIC_API_URL` (`.env.local`, defaults
`http://localhost:8000`); browser mutations (upload, appeal status) are client components
posting cross-origin to the same base. `lib/types.ts` mirrors the backend response models.

## Gotchas

- Use the Python 3.12 venv, never the system 3.14 (`py -3.12`).
- Tests are pinned to Docker Postgres in `tests/conftest.py` even when `.env` has
  `DB_IAM_AUTH=true`, so the suite never hits Aurora — preserve that pin.
- The note "claimgaurd" (typo) in the TRD filename is intentional; don't "fix" the path.
