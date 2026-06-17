# ClaimGuard — Practice Profile, Letterhead & Knowledge Base

## Problem

The app works on **demo data** but falls apart for real practices:

- **PDF/DOC exports** use hardcoded placeholders (`123 Medical Drive, Anytown, ST 12345`). A real practice can't send these.
- **The AI drafts letters** with no context about who's signing them — no doctor name, NPI, practice tone, or payer-specific knowledge.
- **No onboarding** — the first user auto-claims the seeded demo practice and lands on a dashboard. There's no profile setup step.
- **No practice-level customization** — every practice gets the same generic appeal letters regardless of specialty, preferred arguments, or payer relationships.

---

## Phase 1: Practice Profile Model (Foundation)

### Extend the Practice Model

Add to `backend/app/models.py` and `backend/schema.sql`:

```python
# --- Identity ---
phone: str | None
fax: str | None
address_line1: str | None
address_line2: str | None
city: str | None
state: str | None        # 2-letter code: CA, TX, NY
zip_code: str | None
website: str | None

# --- Credentials (used in appeal letters) ---
npi: str | None          # National Provider Identifier (10-digit)
tax_id: str | None       # EIN / TIN
primary_provider_name: str | None   # "Dr. Sarah Chen, MD"
primary_provider_credentials: str | None  # "MD", "DO", "NP"

# --- Preferences ---
default_appeal_tone: str  # "formal", "assertive", "concise" — defaults to "formal"
default_response_window_days: int  # overrides per-payer window, default 45
specialty: str | None     # "family_medicine", "cardiology", "orthopedics", etc.

# --- AI context (Phase 3) ---
ai_custom_instructions: str | None  # "Always cite CMS LCD L34873 for lumbar MRIs"
ai_knowledge_entries: JSONB | None  # array of {title, content, category}
```

### Database Migration

```sql
ALTER TABLE practices ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS fax text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS npi text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS primary_provider_name text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS primary_provider_credentials text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS default_appeal_tone text DEFAULT 'formal';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS default_response_window_days int DEFAULT 45;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS ai_custom_instructions text;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS ai_knowledge_entries jsonb;
```

### PATCH /me/practice

Add a `PATCH /me/practice` endpoint accepting partial updates. Auth-gated to the
practice owner. Returns the updated Practice.

---

## Phase 2: Letterhead (Export Gets Real)

### Update `export.py`

Replace all hardcoded placeholders with real practice data:

```python
def _build_letter_header(appeal: Appeal) -> dict:
    practice = appeal.denial.claim.practice
    # ...

    return {
        # Sender block
        "practice_name": practice.name,
        "address_line1": practice.address_line1 or "",
        "city_state_zip": _format_csz(practice),
        "phone": practice.phone or "",
        "fax": practice.fax or "",

        # Credentials
        "provider_name": practice.primary_provider_name or "Billing Department",
        "provider_creds": practice.primary_provider_credentials or "",
        "npi": practice.npi or "",
        "tax_id": practice.tax_id or "",

        # ... existing claim/patient/payer fields
    }
```

### PDF/DOC Letter Layout (revised)

```
┌────────────────────────────────────┐
│  RIVERSIDE FAMILY MEDICINE          │
│  456 Oak Street, Suite 200          │
│  Springfield, IL 62701              │
│  Phone: (217) 555-0142              │
│  Fax: (217) 555-0143                │
│  NPI: 1234567890 | Tax ID: 12-3456789│
├────────────────────────────────────┤
│                                     │
│  June 17, 2026                      │
│                                     │
│  Blue Cross Blue Shield             │
│  Claims Department                  │
│                                     │
│  RE: Appeal of Denied Claim         │
│  Patient: Maria Gonzalez            │
│  DOS: March 14, 2024                │
│  Denial Code: CO-50                 │
│                                     │
│  To Whom It May Concern:            │
│                                     │
│  [letter body from TipTap HTML]      │
│                                     │
│  Sincerely,                         │
│                                     │
│  Sarah Chen, MD                     │
│  Riverside Family Medicine           │
└────────────────────────────────────┘
```

### If profile is incomplete

When export is triggered but key fields are missing, return a clear error:
```json
{"detail": "Practice profile incomplete: missing address_line1, phone, npi"}
```
And show a toast on the frontend: *"Set up your practice profile before exporting."*

---

## Phase 3: Onboarding Flow

### Replace the Auto-Claim Magic

Current flow: user signs up → instantly lands on dashboard with seeded data.
This is good for demos but gives no opportunity to set up a profile.

New flow:

```
Sign Up → Onboarding Wizard (3 steps) → Dashboard
```

### Step 1: Practice Info

```
┌─────────────────────────────────┐
│  Let's set up your practice      │
│                                  │
│  Practice Name: [_______________] │
│  Specialty: [Dropdown            ]│
│  Phone: [_______________]         │
│  Fax: [_______________]           │
│  Address: [_______________]       │
│  City/State/ZIP: [___] [__] [__] │
│  NPI: [_______________]           │
│  Tax ID: [_______________]        │
│                                  │
│  [Continue]                       │
└─────────────────────────────────┘
```

### Step 2: Provider

```
┌─────────────────────────────────┐
│  Who signs your appeals?         │
│                                  │
│  Provider Name: [_______________] │
│  Credentials: [MD / DO / NP]     │
│                                  │
│  Appeal tone:                     │
│  ○ Formal (standard)              │
│  ○ Assertive (stronger arguments) │
│  ○ Concise (short letters)        │
│                                  │
│  Response window: [45] days       │
│                                  │
│  [Continue]                       │
└─────────────────────────────────┘
```

### Step 3: Confirmation

```
┌─────────────────────────────────┐
│  Ready to go                      │
│                                  │
│  Your practice profile is set up. │
│  You can edit it anytime in       │
│  Settings → Practice Profile.     │
│                                  │
│  [Go to Dashboard]                │
└─────────────────────────────────┘
```

### Technical notes

- Non-modal — each step is a route: `/onboarding/profile`, `/onboarding/provider`, `/onboarding/confirm`
- Each step saves to the backend immediately (PATCH on blur/continue), so partial progress is never lost
- Middleware redirects to `/onboarding/profile` if the practice has no `address_line1` set (configurable gate)
- The seeded demo practice remains available for the `/sign-in?demo=true` flow or when `ONBOARDING_REQUIRED=false`

---

## Phase 4: Practice Settings Page

Add a route at `/settings` (within the dashboard sidebar) with these tabs:

| Tab | Contents |
|---|---|
| **Profile** | All practice identity fields (name, address, phone, NPI, etc.) |
| **Appeal defaults** | Tone, response window, provider name |
| **AI Instructions** | Custom instructions textarea + knowledge entries (Phase 5) |

Each tab uses a simple form with `PATCH /me/practice` on save. Toast on success.

---

## Phase 5: AI Knowledge Base & Persona

### What this is

Each practice can feed the LLM **custom instructions** and a **knowledge base**
of payer-specific tips, successful appeal angles, and local coverage policies.

### How it works

#### Custom Instructions

A textarea on the Settings page:
> *"Any advice you give the AI for drafting appeal letters?"*

Example: *"Always cite the 2024 ACR Appropriateness Criteria for MRI of the lumbar spine. If the denial is CO-50 for 72148, reference the patient's failed conservative treatment."*

This gets injected into the `DRAFT_APPEAL` prompt.

#### Knowledge Entries

A simple key-value store. The practice adds entries like:

| Category | Title | Content |
|---|---|---|
| Aetna | CO-50 for MRI spine | Aetna's clinical policy 0032 requires 6 weeks conservative treatment documented. Cite dates of PT and medication trials. |
| UnitedHealthcare | Timely filing | UHC's appeal window is 180 days for commercial plans. Reference policy ADMIN-045. |
| Medicare | LCD L34873 | Local coverage determination for lumbar MRI — must document red flags or 6 weeks failed conservative care. |

Entries are stored as `ai_knowledge_entries` JSONB and injected into the prompt when a matching payer/code is detected.

### Prompt Injection

When drafting an appeal, the LLM prompt gets augmented with:

```
# Practice Context
Provider: Dr. Sarah Chen, MD
Practice: Riverside Family Medicine
Specialty: Family Medicine
Appeal Tone: assertive

# Relevant Knowledge
## Denial Code CO-50
Aetna's clinical policy 0032 requires 6 weeks conservative treatment documented...

# Custom Instructions
Always cite the 2024 ACR Appropriateness Criteria...
```

### Retrieval

Before drafting, the pipeline node queries:
1. Exact match on `(payer_name, denial_code)` → return matching entry
2. Fallback: match on `(denial_code)` only
3. Fallback: match on `(denial_code category)` 
4. Always include `ai_custom_instructions`

### UI for managing entries

A table on `/settings/ai` with columns: Category, Title, Content preview, Delete.
Inline add/delete. Simple, no rich editing needed — just text areas.

---

## Phase 6: Advanced (Future)

### Letterhead Templates

Allow practices to choose from 2-3 letterhead styles (clean, traditional, minimal)
or upload a PNG logo. Render in the PDF.

### Per-Payer Appeal Windows

Replace the hardcoded 45-day response window with payer-specific values stored
on the Payer model. Auto-populate for known payers (Medicare=60, BCBS=45, UHC=45, Aetna=30).

### Provider Directory

Practices with multiple doctors add multiple providers. The appeal panel gets a
dropdown: "Signed by: Dr. Chen vs. Dr. Patel."

### Audit Trail for Profile Changes

Log profile edits to the ActivityLog for compliance.

---

## Implementation Order

| Phase | Effort | Impact | Depends on |
|---|---|---|---|
| 1 — Practice Model | 1-2 hours | Foundation for everything | Nothing |
| 2 — Letterhead | 1 hour | Makes export usable | Phase 1 |
| 3 — Onboarding | 2-3 hours | Critical UX for new users | Phase 1 |
| 4 — Settings Page | 1 hour | Lets users update anytime | Phase 1 |
| 5 — AI Knowledge Base | 2-3 hours | Differentiator, better letters | Phase 1, 4 |

Total: ~8–10 hours across all phases.

**Recommended first sprint:** Phases 1 + 2 (practice model + real letterhead).
That alone turns the export from a demo feature into something a real practice
can use today.
