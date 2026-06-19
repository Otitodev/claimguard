# AGENTS.md

## What this is

ClaimGuard automates insurance claim-denial processing: ingest an EOB/denial PDF →
extract & classify → draft an appeal letter. Two independent halves: `backend/`
(FastAPI + LangGraph + Postgres) and `frontend/` (Next.js 16 + Tailwind v4).
Design doc: `claimgaurd_TRD.md` (the "claimgaurd" typo is intentional; do not "fix" it).

## Commands

All from repo root:

```bash
docker compose up -d                          # Postgres 16 (required for app & tests)

# Backend — Python 3.12 (NOT 3.14)
cd backend
py -3.12 -m venv .venv                        # first time only
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe seed.py              # create tables + seed demo practice; --reset to wipe
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000   # :8000, docs at /docs
.venv\Scripts\python.exe -m pytest -q                       # full suite (fake LLM, no API key)
.venv\Scripts\python.exe -m pytest -q tests/test_pipeline.py::test_name  # single test

# Frontend — Node 22
cd frontend
npm run dev           # :3000
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format        # prettier
```

## Architecture notes

### Backend

- **Single pipeline entrypoint:** `app/pipeline/graph.py::run_pipeline()` — shared by manual upload
  (`api/claims.py`) and AgentMail webhook (`api/webhooks.py`). The LangGraph graph is **rebuilt
  per request** so node closures capture the request-scoped SQLAlchemy session.
- **LLM provider abstraction:** all model access via `app/llm/provider.py::get_chat_model()`.
  Swap `LLM_PROVIDER`/`LLM_MODEL` via env with no code change.
- **Persistence is idempotent:** match-or-create for patient/payer/claim; duplicate denials
  guarded on `(claim_id, denial_code, denial_date)`. Appeal deadline = denial_date +
  `payers.appeal_window_days`.
- **Money fields** are `Decimal` and serialize to JSON **strings**.
- **No lint/typecheck for Python** — there is no pyproject.toml, ruff, or mypy config.
- `schema.sql` is the canonical DDL; `app/models.py` mirrors it; `init_db()` runs `create_all`
  plus idempotent `_MIGRATIONS`.

### Frontend

- **Better Auth** for authentication. The frontend has its **own separate Postgres** (Neon,
  `DATABASE_URL` in `.env.local`) for Better Auth tables — distinct from the backend's Postgres.
- The API verifies Better Auth JWTs against the frontend's JWKS endpoint. Configure
  `BETTER_AUTH_URL` on the backend to point at the frontend origin.
- **Icons:** hugeicons (not lucide). **Font:** Geist. **Style preset:** shadcn/ui `b5KcMrk3P` (luma).
- Route groups: `app/(app)/` is the authed dashboard behind middleware; `app/(marketing)/` is
  the public landing page. Middleware is an optimistic cookie check redirecting to `/sign-in`.
- Server components fetch via `lib/api.ts` helpers; browser mutations post cross-origin to
  `NEXT_PUBLIC_API_URL`.

## Gotchas

- **Python 3.12 only.** The venv must be created with `py -3.12 -m venv .venv`. Dependencies
  lack wheels for 3.14.
- **Tests require Docker Postgres running.** The suite always uses Docker Postgres
  (`tests/conftest.py` forces `DB_IAM_AUTH=false`), even when `.env` targets Aurora.
- **No Azure/OpenAI config.** The provider abstraction supports only Anthropic out of the box.
  The README mentions `OPENAI_API_KEY` but the codebase and `.env.example` use `ANTHROPIC_API_KEY`
  (via langchain-anthropic). Trust the `.env.example`.
- **Dual database mode:** `DB_IAM_AUTH=true` enables Aurora IAM token auth with NullPool
  (the gateway eats idle connections). Full runbook: `backend/README.md` §9.
- **The "claimgaurd" typo** in the TRD filename is intentional — don't rename it.
- **CORS origins:** no trailing slashes. Comma-separated in `CORS_ORIGINS` env var.
- **Frontend `.env.local`** (not `.env`) — Next.js convention. Backend uses `.env`.
- **No test command for frontend** — `npm run test` in README doesn't exist in package.json.
