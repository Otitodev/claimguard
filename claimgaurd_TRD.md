# ClaimGuard — Technical Requirements Document (v1 / Hackathon MVP)

## 1. Overview

ClaimGuard is a B2B SaaS tool for small medical practices that automates
the processing of insurance claim denials. A clinic forwards or uploads
an EOB/denial letter (PDF). AI extracts the claim and denial details,
classifies the denial (resubmit / appeal / write_off), drafts an appeal
letter when appropriate, and tracks everything — status, deadlines,
revenue at risk, revenue recovered — on a live dashboard.

Built for the H0 Hackathon (Track 2: Monetizable B2B App). Must use
Vercel/v0 for the frontend and Aurora PostgreSQL as the database.

---

## 2. Architecture

```
v0 / Next.js frontend (Vercel)
        |
        v
FastAPI backend
        |
        +--> AgentMail webhook (inbound email + PDF attachments)
        +--> Manual upload endpoint (PDF)
        |
        v
LangGraph agent pipeline
        |
        v
Aurora PostgreSQL (claims, denials, appeals, activity_log)
        |
        v
Dashboard reads (analytics, claims table, needs-action queue)
```

Ingestion has two entry points (email-in via AgentMail, and manual
upload) that converge on the same pipeline and the same Aurora tables.

---

## 3. Tech Stack

- Frontend: Next.js, scaffolded via v0.app, deployed on Vercel
- Backend: FastAPI (Python)
- Agent orchestration: LangGraph
- AI model: Claude, accessed through a **provider-agnostic abstraction**
  (see "Model Provider Abstraction" below). Default `claude-opus-4-8`
  (strong PDF document-understanding + reasoning for classification and
  letter drafting); `claude-sonnet-4-6` is an acceptable cost/speed
  step-down. Avoid Fable 5 here: pricier, and unavailable under
  zero-data-retention, which matters for the PHI posture (Section 11).
- Database: Amazon Aurora PostgreSQL (Serverless v2)
- Email ingestion: AgentMail (per-practice inbox + webhook)

### Model Provider Abstraction (avoid vendor lock-in)

Since LangGraph is already in the stack, the LLM calls are coded against
LangChain's provider-agnostic chat-model interface rather than a single
vendor SDK. Swapping providers becomes a config change, not a rewrite.

- **Selection is config-driven.** `LLM_PROVIDER` (e.g. `anthropic`,
  `bedrock`, `openai`) + `LLM_MODEL` env vars resolve a model via
  `init_chat_model(settings.LLM_MODEL, model_provider=settings.LLM_PROVIDER)`.
- **Two of the three LLM steps are trivially portable.**
  `classify_denial` uses `llm.with_structured_output(PydanticModel)` —
  this gives the same schema guarantee across providers (it compiles to
  each provider's native structured-output / tool-calling mechanism), so
  we drop the Anthropic-specific `output_config.format`. `draft_appeal`
  is plain text generation and fully portable.
- **PDF understanding is the one genuinely provider-sensitive step**, so
  it is isolated behind a single function `extract_eob(pdf_bytes,
  practice_id) -> ExtractedEOB`. Internally it can branch: native
  multimodal/document input for providers that support it (Claude,
  GPT-4o, Gemini — different request shapes, varying quality), or an
  OCR/text fallback (`pdfplumber` → text → any text LLM) for those that
  don't. The rest of the pipeline never knows which path ran.
- **For this AWS hackathon, Amazon Bedrock is the pragmatic portability
  story:** keeps everything on AWS (already required for Aurora), serves
  Claude *and* other models (Llama, Titan, Nova) through one API, and
  LangChain's `ChatBedrock` is a drop-in. Note Bedrock uses
  `anthropic.`-prefixed model IDs and does not support Anthropic
  server-side tools — neither matters for this pipeline.
- **Scope discipline:** build the abstraction (cheap, and a strong
  "not locked in" talking point), default to Claude, but do **not** spend
  demo-prep time validating a second provider end-to-end. Portability is
  worth the interface, not the QA matrix, at hackathon stage.

---

## 4. Database Schema (Aurora PostgreSQL)

See `schema.sql` for full DDL. Summary of tables:

- **practices** — id, name, created_at
- **payers** — id, name, payer_type, appeal_window_days
  - appeal_window_days drives `appeal_deadline` = denial_date +
    appeal_window_days. Seed a sensible default per payer_type (e.g.
    commercial 180, medicare 120, medicaid 90) so the lookup in
    Section 6 has a backing column.
- **patients** — id, practice_id, name, dob
- **claims** — id, practice_id, patient_id, payer_id, date_of_service,
  cpt_codes[], icd_codes[], billed_amount, status, created_at, updated_at
  - status: submitted | paid | partially_paid | denied | appealed |
    resolved | written_off
- **denial_codes** — code (PK), description, category
  - category: medical_necessity | missing_info | timely_filing |
    eligibility | duplicate
- **denials** — id, claim_id, denial_code, denied_amount, denial_date,
  appeal_deadline, ai_reason_summary, ai_classification,
  source_document_url, raw_extracted_text, created_at
  - ai_classification: resubmit | appeal | write_off
  - **One-vs-many simplification (v1):** `parse_eob` may extract multiple
    CARC codes, but each `denials` row stores a single `denial_code`. For
    the MVP, persist **one denials row** using the primary code (the one
    tied to the largest denied_amount, else the first). `classify_denial`
    runs against that primary code. If time allows, the more correct model
    is one denials row per (claim, code) with classification per code —
    but that ripples into analytics and the needs-action query, so treat
    it as a stretch goal, not the baseline.
  - **Idempotency:** before inserting, skip if a denial with the same
    `claim_id + denial_code + denial_date` already exists. AgentMail
    retries webhooks and PDFs can be re-uploaded; without this guard the
    same EOB produces duplicate denials and activity_log entries.
- **appeals** — id, denial_id, letter_text, status, submitted_date,
  outcome_date, recovered_amount, created_at
  - status: drafted | submitted | won | lost | pending
- **activity_log** — id, claim_id, action_type, actor, details (jsonb),
  created_at
  - action_type: uploaded | parsed | classified | appeal_drafted |
    appeal_submitted | appeal_won | appeal_lost | status_changed
  - actor: ai | user
  - The post-draft lifecycle actions (submitted / won / lost) are written
    by `PATCH /appeals/{id}` so the claim-detail timeline reflects the full
    appeal lifecycle, not just the AI steps.

Seed `denial_codes` with ~10-15 common CARC codes (CO-50, CO-16,
CO-29, CO-18, CO-29, CO-197, etc.) covering each category, so the
classifier has real categories to work with.

---

## 5. Email Ingestion (AgentMail)

- On practice signup, create a dedicated AgentMail inbox for that
  practice (e.g. `denials-{practice_slug}@yourdomain`).
- Register a webhook for `message.received` events pointing at
  `POST /webhooks/agentmail`.
- Verify the AgentMail webhook signature before processing — otherwise
  anyone who discovers the URL can inject claims. Reject unsigned/invalid
  payloads with 401.
- Webhook handler returns 200 immediately, then in the background
  (FastAPI `BackgroundTasks`):
  - For each attachment in the payload, call the AgentMail attachments
    API to download the PDF bytes.
  - Pass each PDF into the agent pipeline (Section 6) along with the
    practice_id (derived from which inbox received the email).

---

## 6. Agent Pipeline (LangGraph)

State object: `{ practice_id, raw_pdf, extracted_data, patient_id,
payer_id, claim_id, denial_id, primary_denial_code, classification,
appeal_letter, appeal_deadline }`

1. **parse_eob** — calls `extract_eob(pdf_bytes, practice_id)` (the
   provider-abstracted extractor from Section 3). For the Claude default,
   that means a document-understanding call with the PDF as a `document`
   content block, returning the Section 7 schema; the function hides the
   per-provider request shape (and any OCR fallback) from the graph.
2. **resolve_patient_and_payer** — the extraction returns `patient_name`
   and `payer_name` as strings, but the schema uses FKs. Match-or-create
   the `patients` row (by name + dob within practice_id) and the `payers`
   row (by name), yielding `patient_id` and `payer_id`. (Can be folded
   into the next step, but it must happen — the pipeline has no IDs
   without it.)
3. **match_or_create_claim** — query `claims` for a row matching
   practice_id + patient_id + date_of_service + payer_id; create if not
   found.
4. **classify_denial** — select the primary denial code (largest
   denied_amount, else first), look up its `denial_codes` category, then
   `llm.with_structured_output(...)` produces `ai_reason_summary`,
   `ai_classification`, and (if appeal) `appeal_angle` (see Section 7).
   Compute `appeal_deadline` = denial_date + `payers.appeal_window_days`.
5. **branch**:
   - if `ai_classification == "appeal"` -> draft_appeal
   - else -> persist
6. **draft_appeal** — `llm.invoke(...)` generates the appeal letter text
   using claim details, denial reason, and appeal_angle. (Plain text
   output — put any letterhead scaffolding in the prompt rather than
   prefilling an assistant turn; prefills are both non-portable and 400 on
   current Claude models.)
7. **persist** — apply the idempotency guard (Section 4), then
   write/update rows in `denials`, `appeals` (if drafted), and insert
   `activity_log` entries for each step that ran (parsed, classified,
   appeal_drafted).

---

## 7. AI Prompts

The JSON shapes below are expressed as Pydantic models and passed to
`llm.with_structured_output(Model)` so the response is schema-constrained
across whichever provider is configured (Section 3), rather than relying
on the "return ONLY JSON" instruction. The instruction text is kept as
belt-and-suspenders but is not the guarantee. `draft_appeal` returns
plain text (no schema).

### parse_eob (document input + this text prompt)

```
You are extracting structured data from a medical insurance Explanation
of Benefits (EOB) or claim denial letter. Given the attached document,
extract the following fields and return ONLY valid JSON — no preamble,
no markdown formatting, no explanation.

{
  "patient_name": string or null,
  "date_of_service": "YYYY-MM-DD" or null,
  "payer_name": string or null,
  "cpt_codes": [array of strings],
  "icd_codes": [array of strings],
  "billed_amount": number or null,
  "denied_amount": number or null,
  "denial_codes": [array of strings, e.g. "CO-50"],
  "denial_date": "YYYY-MM-DD" or null
}

If a field cannot be determined from the document, use null (or an
empty array for list fields). Do not guess or fabricate values that
aren't present in the document.
```

### classify_denial (extracted data + denial code category)

```
You are a medical billing specialist assistant helping a clinic decide
how to respond to an insurance claim denial.

You will be given:
- The denial code and its category (e.g. medical_necessity, missing_info,
  timely_filing, eligibility, duplicate)
- The claim's CPT and ICD-10 codes
- The billed and denied amounts
- The payer name

Your task:
1. Write a 1-2 sentence plain-English explanation of why this claim was
   denied, written for clinic staff with no billing background.
2. Classify the next action as exactly one of: "resubmit", "appeal", or
   "write_off".
   - "resubmit": a correctable error (wrong modifier, missing info) —
     fix and resubmit.
   - "appeal": the denial can reasonably be contested (e.g. medical
     necessity) and the service was likely appropriate.
   - "write_off": not realistically recoverable (e.g. past timely
     filing, duplicate of an already-paid claim).
3. If classification is "appeal", add one sentence on the strongest
   medical-necessity argument given the CPT/ICD combination. Otherwise
   set this field to null.

Return ONLY valid JSON:
{
  "reason_summary": string,
  "classification": "resubmit" | "appeal" | "write_off",
  "appeal_angle": string or null
}
```

### draft_appeal (claim + denial + appeal_angle)

```
You are drafting a formal insurance appeal letter on behalf of a
medical practice. Use a professional, factual tone.

You will be given:
- Patient and claim details (date of service, CPT/ICD codes, billed
  amount)
- The denial code and reason
- A suggested medical-necessity argument

Write a complete appeal letter that:
- States the claim being appealed (date of service, billed amount,
  denial code)
- Presents the medical necessity argument clearly, tied to the specific
  CPT/ICD codes
- Requests reconsideration and payment of the claim
- Uses a professional closing

Return ONLY the letter text, no JSON, no commentary.
```

---

## 8. Backend API (FastAPI)

- `POST /webhooks/agentmail` — AgentMail webhook receiver (Section 5)
- `POST /claims/upload` — manual PDF upload; `practice_id` + file;
  triggers the same pipeline
- `GET /claims` — list claims, filterable by practice_id, status, payer
- `GET /claims/{id}` — claim detail including denial, appeal, and
  activity log
- `PATCH /appeals/{id}` — update appeal letter text or status (drafted
  -> submitted -> won/lost)
- `GET /analytics/summary?practice_id=` — returns:
  - total_claims
  - denial_rate = (claims with status in denied/appealed/written_off) /
    total_claims, over all seeded data (state the window in the response
    so the dashboard number is defensible)
  - revenue_at_risk (sum of denied_amount where classification !=
    write_off and appeal not yet won)
  - revenue_recovered_this_month (sum of recovered_amount where
    appeals.status = 'won' and outcome_date in current month)
  - denial_rate_by_payer, revenue_at_risk_by_category
- `GET /denials/needs-action?practice_id=` — **appeals in `drafted`
  status not yet `submitted`**, joined to their denial, with
  appeal_deadline within 7 days, sorted by deadline ascending. (The
  earlier "denials with no linked appeal row" definition conflicts with
  the pipeline, which auto-drafts an appeal for every appeal-classified
  denial — so those would never appear, and resubmit/write_off denials
  shouldn't. The actionable queue is "drafted appeals awaiting your
  review/submission before the deadline.")

---

## 9. Frontend (v0 / Next.js / Vercel)

Pages, per the dashboard spec already designed:

1. **Dashboard home** — summary cards (Total Claims, Denial Rate,
   Revenue at Risk, Revenue Recovered this month) + two charts (Denial
   Rate by Payer, Revenue at Risk by Category)
2. **Needs Action panel** — table of drafted appeals awaiting
   review/submission with deadline <= 7 days, sorted by deadline,
   "Review & Submit" action (per the `/denials/needs-action` definition
   in Section 8)
3. **Claims table** — sortable/filterable, columns: Patient, Date of
   Service, Payer, CPT Codes, Billed Amount, Status (color-coded badge)
4. **Claim detail panel** — claim info, denial code + AI reason +
   classification, editable appeal letter text area, appeal status,
   activity timeline
5. **Upload page** — drag-and-drop PDF upload with processing status
   (uploaded -> parsing -> classified)

Styling: calm healthcare-SaaS palette (blues/teals/greens), card-based
layout, clear status badges.

---

## 10. Design System

The visual identity is grounded in the world of medical billing — codes,
stamps, and ledgers — rather than generic SaaS chrome.

### Tokens

- Color:
  - Paper (background): `#F6F4ED`
  - Ink (primary text): `#25302B`
  - Ledger teal (brand/primary actions): `#0F6E56`
  - Claim amber (pending/needs action): `#BA7517`
  - Denial rust (denied/at-risk): `#993C1D`
  - Recovered green (won/recovered): `#3B6D11`
- Type:
  - Display/headers: a serif with form-letter character (e.g. Source
    Serif 4 or Fraunces) — used for page titles and section headers
  - Body/UI: a clean humanist sans (e.g. Inter or Public Sans)
  - Codes/data: a monospace (e.g. IBM Plex Mono) — used for every CPT,
    ICD, and CARC code, plus dollar amounts and dates
- Layout: narrow left rail (icon + label nav), top "ledger header" with
  practice name, stat-card row, then claims as ledger rows with hairline
  dividers rather than heavy cards

### Signature element — code stamps

Every code (CPT, ICD, CARC denial code, claim status) renders as a small
monospace badge with a border and tinted background — like an ink stamp
on a paper claim form. This is the recurring visual thread across the
claims table, claim detail panel, activity timeline, and appeal letter.
Build it as a single reusable component with a `variant`/`status` prop
early, since it appears in nearly every view.

### Primitives

- **Code stamp** — neutral mono badge for CPT/ICD/CARC codes
- **Status badge** — claim status (paid/denied/appealed/written-off/
  resolved), each a distinct semantic color
- **Deadline chip** — days-remaining, escalates gray -> amber -> red as
  the appeal deadline approaches
- **Metric card** — label + large number, used in 2x2 grids for the
  dashboard summary stats
- **Button** — teal primary, outline secondary

### Composite components

- **Ledger row** — claims table row: patient, payer, code stamps,
  status badge, deadline chip
- **Needs-action item** — ledger row variant with a "Draft Appeal"
  action
- **Claim detail panel** — slide-over with claim info, denial reasoning,
  editable appeal letter (styled as a serif "letter"), and activity
  timeline
- **Activity timeline entry** — icon + actor tag (AI/user) + description
  + timestamp
- **Upload dropzone** — with a processing stepper (uploaded -> parsing
  -> classified), styled consistently with status badges
- **Chart containers** — denial rate by payer, revenue at risk by
  category; use the teal/amber/rust palette so charts visually rhyme
  with the table

### Nav

Left rail with icon + label items: Home, Needs Action (with count
badge), Claims, Upload. Top ledger header shows the practice name —
useful later for multi-practice switching.

---

## 11. MVP Scope & Constraints

In scope:
- Manual PDF upload (primary demo path)
- AgentMail email-in (built, even if not the main demo path — strong
  for "real-world applicability")
- Full agent pipeline: parse -> match/create claim -> classify ->
  (maybe) draft appeal -> persist
- Dashboard with analytics, claims table, needs-action queue, claim
  detail
- Single practice for demo purposes (multi-tenant schema supports more,
  but seed one practice with realistic sample data)

Out of scope (v1):
- Real clearinghouse/835/ERA integration
- Outbound fax/portal submission of appeals
- User authentication/roles beyond a single practice context
- Editing denial_codes via UI (seed via migration/script)

**PHI / HIPAA posture:** all demo data is **synthetic** — no real patient
information. A production deployment handling real PHI would require a
Business Associate Agreement with Anthropic and an appropriate data-
retention configuration (which also constrains model choice — e.g.
Fable 5 is not available under zero data retention). Worth a sentence in
the pitch; out of scope to implement for v1.

---

## 12. Demo Script (for the 3-5 min video)

1. Open dashboard — show summary cards and charts with seeded data
   (a realistic-looking denial history).
2. Go to Upload, drag in a sample EOB PDF.
3. Show processing status moving uploaded -> parsing -> classified in
   real time.
4. Open the resulting claim — show extracted data, AI reason summary,
   classification = "appeal", and the drafted appeal letter.
5. Return to dashboard — show the claim now reflected in the claims
   table and the analytics numbers updated.
6. Show the Needs Action panel highlighting a different claim with an
   approaching appeal deadline.
7. Close on the architecture diagram and mention the AgentMail
   email-in path and the Aurora schema (for the AWS database
   requirement screenshots).
