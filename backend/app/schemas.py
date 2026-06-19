"""Pydantic models.

The two extraction/classification models double as the schema passed to
``llm.with_structured_output(...)`` (TRD §7) — provider-agnostic structured
output. The rest are API response shapes.
"""

import re
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Classification = Literal["resubmit", "appeal", "write_off"]

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# --- LLM structured-output schemas (TRD §7) ---------------------------------


class ExtractedEOB(BaseModel):
    """Structured extraction from an EOB / denial letter (parse_eob)."""

    patient_name: Optional[str] = None
    date_of_service: Optional[date] = None
    payer_name: Optional[str] = None
    cpt_codes: list[str] = Field(default_factory=list)
    icd_codes: list[str] = Field(default_factory=list)
    billed_amount: Optional[float] = None
    denied_amount: Optional[float] = None
    denial_codes: list[str] = Field(default_factory=list)
    denial_date: Optional[date] = None


class DenialClassification(BaseModel):
    """Classification output (classify_denial)."""

    reason_summary: str
    classification: Classification
    appeal_angle: Optional[str] = None


class AppealCritique(BaseModel):
    """Self-review of a drafted appeal letter (critique_appeal).

    The pipeline uses ``revised_letter`` to replace a weak draft before it is
    persisted, so the agent improves its own output before a human sees it.
    """

    adequate: bool
    score: int = Field(ge=1, le=5)
    issues: list[str] = Field(default_factory=list)
    revised_letter: Optional[str] = None


# --- API response models -----------------------------------------------------


class CodeStamp(BaseModel):
    code: str
    category: Optional[str] = None


class ClaimSummary(BaseModel):
    id: uuid.UUID
    patient_name: str
    date_of_service: Optional[date]
    payer_name: str
    cpt_codes: list[str]
    billed_amount: Optional[Decimal]
    status: str

    model_config = {"from_attributes": True}


class DenialOut(BaseModel):
    id: uuid.UUID
    denial_code: Optional[str]
    denied_amount: Optional[Decimal]
    denial_date: Optional[date]
    appeal_deadline: Optional[date]
    ai_reason_summary: Optional[str]
    ai_classification: Optional[str]

    model_config = {"from_attributes": True}


class AppealOut(BaseModel):
    id: uuid.UUID
    denial_id: uuid.UUID
    letter_text: Optional[str]
    status: str
    submitted_date: Optional[date]
    outcome_date: Optional[date]
    recovered_amount: Optional[Decimal]
    expected_response_date: Optional[date]
    status_updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ActivityOut(BaseModel):
    id: uuid.UUID
    action_type: str
    actor: str
    details: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


class ClaimDetail(BaseModel):
    id: uuid.UUID
    patient_name: str
    date_of_service: Optional[date]
    payer_name: str
    cpt_codes: list[str]
    icd_codes: list[str]
    billed_amount: Optional[Decimal]
    status: str
    denials: list[DenialOut]
    appeals: list[AppealOut]
    activity: list[ActivityOut]


class NeedsActionItem(BaseModel):
    appeal_id: uuid.UUID
    denial_id: uuid.UUID
    claim_id: uuid.UUID
    patient_name: str
    payer_name: str
    denial_code: Optional[str]
    denied_amount: Optional[Decimal]
    appeal_deadline: Optional[date]
    days_remaining: Optional[int]
    # "deadline" = drafted appeal nearing filing deadline
    # "overdue" = submitted appeal past expected payer response date
    kind: str = "deadline"
    submitted_date: Optional[date] = None
    expected_response_date: Optional[date] = None
    days_since_submission: Optional[int] = None


class PayerRate(BaseModel):
    payer_name: str
    total_claims: int
    denied_claims: int
    denial_rate: float


class CategoryRisk(BaseModel):
    category: Optional[str]
    revenue_at_risk: Decimal


class AnalyticsSummary(BaseModel):
    total_claims: int
    denial_rate: float
    denial_rate_window: str
    revenue_at_risk: Decimal
    revenue_recovered_this_month: Decimal
    denial_rate_by_payer: list[PayerRate]
    revenue_at_risk_by_category: list[CategoryRisk]
    appeals_in_progress: int = 0
    avg_days_to_resolution: Optional[float] = None


class AppealUpdate(BaseModel):
    letter_text: Optional[str] = None
    status: Optional[Literal["drafted", "submitted", "won", "lost", "pending"]] = None
    recovered_amount: Optional[Decimal] = None


# --- Lead capture (marketing landing page) -----------------------------------


class LeadCreate(BaseModel):
    email: str
    practice_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = v.strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("invalid email address")
        return v

    @field_validator("practice_name")
    @classmethod
    def _clean_practice(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class LeadCreated(BaseModel):
    id: uuid.UUID
    email: str
    practice_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
