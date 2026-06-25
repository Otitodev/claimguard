# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ClaimGuard is a B2B SaaS tool that automates insurance claim-denial processing for small
medical practices: ingest an EOB/denial PDF (manual upload **or forwarded email**) → extract
& classify the denial → draft + self-critique an appeal letter when warranted → surface
analytics / claims / needs-action. New practices complete a profile-onboarding wizard (used as
real letterhead on appeal letters); the dashboard also shows a **Plan & ROI** panel
(monetization) and an **Email intake** card. `claimgaurd_TRD.md` is the source-of-truth design
doc; its section numbers (TRD §N) are referenced throughout the code. (It's kept **local-only /
untracked** — present in this working copy but not committed, so it won't appear in a fresh
clone.) The repo has two independent parts: `backend/` (FastAPI + LangGraph + Postgres) and
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
match_or_create_claim → retrieve_policy → classify_denial → (conditional: draft_appeal →
critique_appeal if classification == "appeal") → persist, then `session.commit()`.
`retrieve_policy` pulls RAG-style CARC/payer guidance that classify + draft consume;
`critique_appeal` is a self-review pass on `LLM_FAST_MODEL` (Haiku) that scores the draft and
swaps in its own rewrite when the first draft is weak. The graph is **rebuilt per request** so
node closures can capture the request-scoped SQLAlchemy session (`build_graph(session, llm,
critique_llm)`); nodes are factory functions (`make_*`) in `nodes.py`. State shape is
`pipeline/state.py`. `run_pipeline(..., source=)` threads how the doc arrived (`"upload"` vs
`"email"`); the draft node also reads the practice's `default_appeal_tone` + `specialty`.

**Persistence is idempotent.** `app/services/persistence.py` does match-or-create for
patient/payer/claim and guards duplicate denials on `(claim_id, denial_code, denial_date)`,
so re-uploading the same EOB does not create duplicates. Appeal deadline = denial_date +
`payers.appeal_window_days`. All lifecycle steps write `activity_log` rows — an emailed-in
document logs `received_email` (actor `agentmail`) instead of `uploaded` (actor `user`), which
is the one place the intake source is recorded (surfaced in the activity timeline).

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

**Deployment.** Live API: `https://apiclaimguard.otito.site` — EC2 (Caddy auto-HTTPS + uvicorn
under systemd) → Aurora Serverless v2. The `infra/` Terraform **documents** that stack but was
**never `apply`/`import`-ed against the live box** (running it builds a *separate* parallel
stack). The running box was built **by hand**, so **redeploys are in-place over SSH**, not
Terraform: `/home/ec2-user/claimguard` is the unzipped artifact (**not a git repo; no `git` on
the box**), so deploy = `scp -r backend/app` (+ `schema.sql`/`seed.py`) then `sudo systemctl
restart claimguard`. The app does **not** run `init_db()` on startup, so after a schema change
run it manually (`.venv/bin/python -c "from app.db import init_db; init_db()"`). SSH (port 22)
is locked to a single IP in the security group; env changes use `infra/update-env.sh` (SSH,
base64-safe, restarts). Railway (`backend/DEPLOY_RAILWAY.md`) is a documented alternative host
that pairs with the `DB_IAM_AUTH=true` free-tier Aurora path.

**API layer.** Routers in `app/api/` (claims, appeals, denials, analytics, webhooks, **me**,
**leads**) registered in `main.py`, which also has CORS (must include the deployed Vercel origin,
not just :3000) and meta routes `/health` + `/practices`. Auth: the Next.js frontend uses
**Better Auth** (ES256 JWT); FastAPI verifies the Bearer token against the frontend's JWKS in
`app/auth.py` and derives the practice from the token (`get_current_practice` — first sign-in
adopts the oldest unowned practice, i.e. the seeded demo). `BETTER_AUTH_URL` on the backend
**must exactly equal** the frontend's Better Auth origin or every authed route 401s. `me.py`
serves `GET`/`PATCH /me/practice` (profile + `agentmail_address`/`profile_complete`). Response
shaping is in `api/serializers.py`; aggregation in `services/analytics.py`; plan labels/prices in
`app/plans.py`. Money fields are `Decimal` and serialize to JSON **strings**.

## Frontend architecture

Next.js 16 App Router (RSC) + Tailwind v4 + shadcn/ui (preset `b5KcMrk3P`, luma style) with
**hugeicons** (not lucide) and the Geist font. Route groups: `app/(app)/` is the authed
dashboard (dashboard, claims, claims/[id], needs-action, upload, **settings**) behind a shared
sidebar layout; `app/onboarding/` is the 3-step profile wizard, kept **outside** `(app)` so the
layout's "incomplete profile → /onboarding" redirect can't loop; `app/(marketing)/` is the
public landing page. Auth gate is `proxy.ts` (Next 16's `proxy()`, not `middleware.ts`) checking
the Better Auth session cookie. Each data page has a `loading.tsx` skeleton (structural, reuses
the real Card/Table primitives) so navigation isn't a frozen shell on the Aurora cold-start.

**Two distinct base URLs (don't swap them):** `NEXT_PUBLIC_API_URL` → the FastAPI backend
(`lib/api-server.ts` for RSC reads via `getAuthToken()`; `lib/api.ts` for browser mutations);
`NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` → the frontend's own origin, where Better Auth lives
(`/api/auth/*`, JWKS, JWT issuer). In prod (Vercel) both must point at the Vercel domain.
`lib/types.ts` mirrors the backend response models.

## Gotchas

- Use the Python 3.12 venv, never the system 3.14 (`py -3.12`).
- Tests are pinned to Docker Postgres in `tests/conftest.py` even when `.env` has
  `DB_IAM_AUTH=true`, so the suite never hits Aurora — preserve that pin.
- The note "claimgaurd" (typo) in the TRD filename is intentional; don't "fix" the path.
- The live box is **hand-built, not Terraform-managed** — deploy via `scp app/` + restart, and
  run `init_db()` by hand after schema changes (see Deployment). Don't `terraform apply` expecting
  to update production.
- `BETTER_AUTH_URL` (backend) and `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` (frontend/Vercel) must
  all equal the frontend origin, and the backend's `CORS_ORIGINS` must include it — otherwise
  authed routes 401 and browser mutations are CORS-blocked.
- AgentMail email-in is **live-provisioned** (inbox `brightknowledge444@agentmail.to`, webhook +
  `AGENTMAIL_WEBHOOK_SECRET` set on the box). Re-running `provision_agentmail.py` creates a
  *duplicate* inbox/webhook — delete the old ones first if re-provisioning.
