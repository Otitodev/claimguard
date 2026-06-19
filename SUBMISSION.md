# ClaimGuard — H0 Hackathon Submission

**Track:** Monetizable B2B App (Healthcare / Insurance)
**AWS Database:** Amazon Aurora PostgreSQL (Serverless v2, free-tier express configuration)
**Frontend:** Next.js 16 deployed on Vercel
**Tag:** #H0Hackathon

---

## What it is

ClaimGuard is a B2B SaaS tool that automates insurance **claim-denial processing**
for small medical practices. A biller uploads an EOB / denial PDF (or forwards a
denial email); ClaimGuard extracts and classifies the denial with an LLM, drafts
an appeal letter when one is warranted, tracks the payer's appeal deadline, and
surfaces analytics, a claims worklist, and a "needs action" queue on a dashboard.

Small practices lose real revenue to denials they never appeal because the manual
workflow (read the EOB, look up the denial code, decide resubmit vs. appeal vs.
write-off, draft the letter, beat the filing deadline) doesn't scale. ClaimGuard
turns that into an automated pipeline.

---

## Which AWS database, and how it's used

**Amazon Aurora PostgreSQL** is the system of record for every entity in the
product: practices, patients, payers, claims, denials, appeals, an append-only
`activity_log`, and inbound sales `leads` from the landing page. All money fields
are stored as exact `NUMERIC` (no float drift) and the relational model enforces
the claim → denial → appeal lifecycle with foreign keys and uniqueness
constraints used for idempotency (a re-uploaded EOB never double-writes a denial,
guarded on `(claim_id, denial_code, denial_date)`).

The cluster runs on the AWS **free-tier "express configuration"**, which has no
VPC or master password. The backend reaches it over Aurora's managed
**internet-access gateway** using short-lived **RDS IAM authentication tokens**
over TLS — a fresh token is minted per connection (boto3 SigV4, no network
round-trip), used as the database password, with `sslmode=require`. Because the
gateway endpoint lives in an `.aws.dev` DNS zone that some resolvers can't reach,
the engine resolves it via public DNS and connects by IP while preserving the
hostname for TLS SNI (the gateway routes on SNI). Connection handling uses a
`NullPool` (one freshly-tokened connection per request) because the gateway reaps
idle connections without a clean TCP reset, which would hang a conventional pool.

This is all isolated behind a single `DB_IAM_AUTH` flag, so the identical
application code runs against local Docker Postgres in development and Aurora in
production with no code change — only environment variables differ.

---

## Architecture

```mermaid
flowchart TD
    subgraph Browser["User's Browser"]
        U["Medical biller"]
    end

    subgraph Vercel["Vercel — Next.js 16 (App Router, RSC)"]
        MKTG["Marketing landing page<br/>+ demo lead form"]
        DASH["Authed dashboard<br/>(analytics · claims · needs-action · upload)"]
    end

    subgraph Backend["FastAPI backend (Railway)"]
        API["REST API<br/>/claims · /appeals · /denials<br/>/analytics · /leads · /webhooks"]
        PIPE["LangGraph pipeline<br/>parse → resolve → match → classify → draft → persist"]
    end

    subgraph AWS["AWS"]
        GW["Aurora internet-access gateway<br/>(IAM-token auth · TLS SNI)"]
        AUR[("Amazon Aurora PostgreSQL<br/>practices · patients · payers<br/>claims · denials · appeals<br/>activity_log · leads")]
    end

    LLM["Anthropic Claude<br/>(provider-abstracted:<br/>extract · classify · draft)"]
    MAIL["AgentMail inbound<br/>denial emails (webhook, wired)"]

    U -->|HTTPS| MKTG
    U -->|HTTPS| DASH
    MKTG -->|"POST /leads"| API
    DASH -->|"fetch (RSC + client mutations)"| API
    MAIL -. "POST /webhooks/agentmail" .-> API
    API --> PIPE
    PIPE -->|"structured output"| LLM
    PIPE -->|"IAM token per connection"| GW
    API -->|"read queries"| GW
    GW --> AUR
```

### Request flow (PDF upload → appeal)

1. Biller uploads an EOB PDF on the Vercel dashboard → `POST /claims/upload`.
2. The **LangGraph pipeline** runs synchronously: `parse_eob` (Claude document
   block, pdfplumber fallback) → `resolve_patient_and_payer` →
   `match_or_create_claim` → `classify_denial` (resubmit / appeal / write_off) →
   conditional `draft_appeal` → `persist`.
3. All writes land in **Aurora** in one transaction; the appeal deadline is
   computed as `denial_date + payer.appeal_window_days`; every step appends to
   `activity_log`.
4. The dashboard reads back analytics, the claims list, and the needs-action
   queue (drafted appeals with deadlines ≤ 7 days) from Aurora.

The same `run_pipeline()` entrypoint backs both the manual upload and the
AgentMail webhook, so email-in ingestion reuses the exact pipeline.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, React Server Components), Tailwind v4, shadcn/ui, deployed on **Vercel** |
| Backend | FastAPI, LangGraph, SQLAlchemy 2.0 (sync), Pydantic v2 |
| AI | Anthropic Claude via a provider abstraction (`init_chat_model`) — swappable to Bedrock with no code change |
| Database | **Amazon Aurora PostgreSQL** (free-tier express config, RDS IAM auth) |
| Email-in | AgentMail webhook (wired to the same pipeline) |

---

## Submission checklist

- [x] AWS database named and explained — **Amazon Aurora PostgreSQL** (above)
- [x] Architecture diagram (above)
- [ ] Vercel project link + Team ID
- [ ] Proof of Aurora usage (AWS Console screenshot of the cluster)
- [ ] Demo video (< 3 min, YouTube)
