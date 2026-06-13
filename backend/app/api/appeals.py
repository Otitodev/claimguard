import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Appeal
from ..schemas import AppealOut, AppealUpdate
from ..services.persistence import log_activity

router = APIRouter(tags=["appeals"])

# appeal status -> activity action_type for the lifecycle timeline (TRD §4)
_STATUS_ACTION = {
    "submitted": "appeal_submitted",
    "won": "appeal_won",
    "lost": "appeal_lost",
}


@router.patch("/appeals/{appeal_id}", response_model=AppealOut)
def update_appeal(
    appeal_id: uuid.UUID,
    payload: AppealUpdate,
    session: Session = Depends(get_session),
) -> AppealOut:
    appeal = session.get(Appeal, appeal_id)
    if appeal is None:
        raise HTTPException(404, "appeal not found")

    if payload.letter_text is not None:
        appeal.letter_text = payload.letter_text
    if payload.recovered_amount is not None:
        appeal.recovered_amount = payload.recovered_amount

    if payload.status is not None and payload.status != appeal.status:
        appeal.status = payload.status
        today = date.today()
        if payload.status == "submitted":
            appeal.submitted_date = today
        elif payload.status in ("won", "lost"):
            appeal.outcome_date = today

        claim_id = appeal.denial.claim_id
        action = _STATUS_ACTION.get(payload.status, "status_changed")
        log_activity(
            session,
            claim_id,
            action,
            actor="user",
            details={"appeal_id": str(appeal.id), "status": payload.status},
        )
        # Reflect terminal appeal outcome on the claim.
        if payload.status == "won":
            appeal.denial.claim.status = "resolved"

    session.commit()
    session.refresh(appeal)
    return AppealOut.model_validate(appeal)
