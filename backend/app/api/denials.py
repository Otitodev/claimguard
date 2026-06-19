from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_practice
from ..db import get_session
from ..models import (
    APPEAL_RESPONSE_WINDOW_DAYS,
    Appeal,
    Claim,
    Denial,
    Patient,
    Payer,
    Practice,
)
from ..schemas import NeedsActionItem

router = APIRouter(tags=["denials"])


@router.get("/denials/needs-action", response_model=list[NeedsActionItem])
def needs_action(
    within_days: int = 7,
    practice: Practice = Depends(get_current_practice),
    session: Session = Depends(get_session),
) -> list[NeedsActionItem]:
    """Drafted appeals with a deadline within `within_days`, plus submitted
    appeals that are past their expected payer response date.
    """
    today = date.today()
    cutoff = today + timedelta(days=within_days)

    items: list[NeedsActionItem] = []

    # --- Drafted appeals nearing filing deadline ---
    drafted_stmt = (
        select(Appeal, Denial, Claim, Patient, Payer)
        .join(Denial, Appeal.denial_id == Denial.id)
        .join(Claim, Denial.claim_id == Claim.id)
        .join(Patient, Claim.patient_id == Patient.id)
        .join(Payer, Claim.payer_id == Payer.id)
        .where(
            Claim.practice_id == practice.id,
            Appeal.status == "drafted",
            Denial.appeal_deadline.is_not(None),
            Denial.appeal_deadline <= cutoff,
        )
        .order_by(Denial.appeal_deadline.asc())
    )

    for appeal, denial, claim, patient, payer in session.execute(drafted_stmt).all():
        days_remaining = (
            (denial.appeal_deadline - today).days
            if denial.appeal_deadline
            else None
        )
        items.append(
            NeedsActionItem(
                appeal_id=appeal.id,
                denial_id=denial.id,
                claim_id=claim.id,
                patient_name=patient.name,
                payer_name=payer.name,
                denial_code=denial.denial_code,
                denied_amount=denial.denied_amount,
                appeal_deadline=denial.appeal_deadline,
                days_remaining=days_remaining,
                kind="deadline",
            )
        )

    # --- Submitted appeals past expected response date ---
    # Appeals submitted before expected_response_date existed have it NULL, so
    # fall back to submitted_date + the standard response window; otherwise those
    # legacy appeals would never surface in this queue.
    effective_response_date = func.coalesce(
        Appeal.expected_response_date,
        Appeal.submitted_date
        + timedelta(days=APPEAL_RESPONSE_WINDOW_DAYS),
    )
    submitted_stmt = (
        select(Appeal, Denial, Claim, Patient, Payer)
        .join(Denial, Appeal.denial_id == Denial.id)
        .join(Claim, Denial.claim_id == Claim.id)
        .join(Patient, Claim.patient_id == Patient.id)
        .join(Payer, Claim.payer_id == Payer.id)
        .where(
            Claim.practice_id == practice.id,
            Appeal.status == "submitted",
            effective_response_date.is_not(None),
            effective_response_date <= today,
        )
        .order_by(effective_response_date.asc())
    )

    for appeal, denial, claim, patient, payer in session.execute(submitted_stmt).all():
        days_since = (
            (today - appeal.submitted_date).days
            if appeal.submitted_date
            else None
        )
        expected_response_date = appeal.expected_response_date or (
            appeal.submitted_date
            + timedelta(days=APPEAL_RESPONSE_WINDOW_DAYS)
            if appeal.submitted_date
            else None
        )
        items.append(
            NeedsActionItem(
                appeal_id=appeal.id,
                denial_id=denial.id,
                claim_id=claim.id,
                patient_name=patient.name,
                payer_name=payer.name,
                denial_code=denial.denial_code,
                denied_amount=denial.denied_amount,
                appeal_deadline=denial.appeal_deadline,
                days_remaining=None,
                kind="overdue",
                submitted_date=appeal.submitted_date,
                expected_response_date=expected_response_date,
                days_since_submission=days_since,
            )
        )

    return items
