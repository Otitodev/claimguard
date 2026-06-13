import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Appeal, Claim, Denial, Patient, Payer
from ..schemas import NeedsActionItem

router = APIRouter(tags=["denials"])


@router.get("/denials/needs-action", response_model=list[NeedsActionItem])
def needs_action(
    practice_id: uuid.UUID,
    within_days: int = 7,
    session: Session = Depends(get_session),
) -> list[NeedsActionItem]:
    """Drafted appeals not yet submitted, with a deadline within `within_days`
    (TRD §8 — redefined to align with the auto-drafting pipeline).
    """
    today = date.today()
    cutoff = today + timedelta(days=within_days)

    stmt = (
        select(Appeal, Denial, Claim, Patient, Payer)
        .join(Denial, Appeal.denial_id == Denial.id)
        .join(Claim, Denial.claim_id == Claim.id)
        .join(Patient, Claim.patient_id == Patient.id)
        .join(Payer, Claim.payer_id == Payer.id)
        .where(
            Claim.practice_id == practice_id,
            Appeal.status == "drafted",
            Denial.appeal_deadline.is_not(None),
            Denial.appeal_deadline <= cutoff,
        )
        .order_by(Denial.appeal_deadline.asc())
    )

    items: list[NeedsActionItem] = []
    for appeal, denial, claim, patient, payer in session.execute(stmt).all():
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
            )
        )
    return items
