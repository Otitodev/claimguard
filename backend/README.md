# ClaimGuard — Backend + Pipeline Core

FastAPI + LangGraph backend that ingests EOB/denial PDFs, extracts and
classifies the denial, drafts an appeal when warranted, and serves analytics /
claims / needs-action endpoints. See `../claimgaurd_TRD.md` for the full design.

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

## Layout

- `app/llm/` — provider abstraction + extract / classify / draft
- `app/pipeline/` — LangGraph state, nodes, graph (`run_pipeline`)
- `app/services/` — persistence + analytics + `agentmail_client` (inbox/webhook/
  attachment)
- `app/api/` — FastAPI routers (incl. `webhooks.py` — Svix verify + pipeline)
- `provision_agentmail.py` — go-live: create inbox + register webhook
- `schema.sql` — canonical DDL (Aurora); `app/models.py` mirrors it for dev

## Out of scope (this build)

Next.js frontend lives in `../frontend`. Aurora provisioning and auth are not
yet built. AgentMail integration is built and mock-tested; only a live account +
tunnel are needed to connect it (see §8).
