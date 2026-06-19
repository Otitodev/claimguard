-- ClaimGuard schema (TRD §4). Canonical DDL for Aurora PostgreSQL.
-- Local dev can instead use app.db.init_db() (create_all from ORM models),
-- which mirrors this file. gen_random_uuid() is built into Postgres 13+.

CREATE TABLE IF NOT EXISTS practices (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    -- Subscription plan key (see app/plans.py); drives the in-app plan/ROI panel.
    plan                text NOT NULL DEFAULT 'claimguard',
    -- Better Auth user id (JWT `sub`) that owns this practice; the API derives
    -- the practice from the authenticated user. One practice per user.
    owner_user_id       text UNIQUE,
    -- AgentMail email-in mapping (TRD §5): inbox dedicated to this practice.
    agentmail_inbox_id  text UNIQUE,
    agentmail_address   text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE,
    payer_type          text,
    -- appeal_deadline = denial_date + appeal_window_days
    appeal_window_days  integer NOT NULL DEFAULT 180
);

CREATE TABLE IF NOT EXISTS patients (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id  uuid NOT NULL REFERENCES practices(id),
    name         text NOT NULL,
    dob          date,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_patient_identity UNIQUE (practice_id, name, dob)
);

CREATE TABLE IF NOT EXISTS claims (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id      uuid NOT NULL REFERENCES practices(id),
    patient_id       uuid NOT NULL REFERENCES patients(id),
    payer_id         uuid NOT NULL REFERENCES payers(id),
    date_of_service  date,
    cpt_codes        text[] NOT NULL DEFAULT '{}',
    icd_codes        text[] NOT NULL DEFAULT '{}',
    billed_amount    numeric(12, 2),
    -- submitted | paid | partially_paid | denied | appealed | resolved | written_off
    status           text NOT NULL DEFAULT 'submitted',
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS denial_codes (
    code         text PRIMARY KEY,
    description  text,
    -- medical_necessity | missing_info | timely_filing | eligibility | duplicate
    category     text
);

CREATE TABLE IF NOT EXISTS denials (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id             uuid NOT NULL REFERENCES claims(id),
    denial_code          text REFERENCES denial_codes(code),
    denied_amount        numeric(12, 2),
    denial_date          date,
    appeal_deadline      date,
    ai_reason_summary    text,
    -- resubmit | appeal | write_off
    ai_classification    text,
    source_document_url  text,
    raw_extracted_text   text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    -- Idempotency guard: one denial per claim+code+date (TRD §4)
    CONSTRAINT uq_denial_identity UNIQUE (claim_id, denial_code, denial_date)
);

CREATE TABLE IF NOT EXISTS appeals (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    denial_id         uuid NOT NULL REFERENCES denials(id),
    letter_text       text,
    -- drafted | submitted | won | lost | pending
    status            text NOT NULL DEFAULT 'drafted',
    submitted_date    date,
    outcome_date      date,
    recovered_amount  numeric(12, 2),
    expected_response_date date,
    status_updated_at timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id     uuid REFERENCES claims(id),
    -- uploaded | parsed | classified | appeal_drafted | appeal_submitted
    --   | appeal_won | appeal_lost | status_changed
    action_type  text NOT NULL,
    actor        text NOT NULL DEFAULT 'ai',
    details      jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL,
    practice_name text,
    source        text NOT NULL DEFAULT 'landing',
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_claims_practice ON claims(practice_id);
CREATE INDEX IF NOT EXISTS ix_denials_claim ON denials(claim_id);
CREATE INDEX IF NOT EXISTS ix_appeals_denial ON appeals(denial_id);
CREATE INDEX IF NOT EXISTS ix_activity_claim ON activity_log(claim_id);
