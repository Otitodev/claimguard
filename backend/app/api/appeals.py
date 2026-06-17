import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..auth import get_current_practice
from ..db import get_session
from ..models import Appeal, Practice
from ..schemas import AppealOut, AppealUpdate
from ..services.export import generate_doc, generate_pdf
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
    practice: Practice = Depends(get_current_practice),
    session: Session = Depends(get_session),
) -> AppealOut:
    from datetime import datetime, timedelta, timezone

    appeal = session.get(Appeal, appeal_id)
    if appeal is None or appeal.denial.claim.practice_id != practice.id:
        raise HTTPException(404, "appeal not found")

    if payload.letter_text is not None:
        appeal.letter_text = payload.letter_text
    if payload.recovered_amount is not None:
        appeal.recovered_amount = payload.recovered_amount

    if payload.status is not None and payload.status != appeal.status:
        appeal.status = payload.status
        appeal.status_updated_at = datetime.now(timezone.utc)
        today = date.today()
        if payload.status == "submitted":
            appeal.submitted_date = today
            appeal.expected_response_date = today + timedelta(days=45)
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
        if payload.status == "won":
            appeal.denial.claim.status = "resolved"

    session.commit()
    session.refresh(appeal)
    return AppealOut.model_validate(appeal)


@router.get("/appeals/{appeal_id}/export")
def export_appeal(
    appeal_id: uuid.UUID,
    format: str = Query("pdf", pattern="^(pdf|doc)$"),
    practice: Practice = Depends(get_current_practice),
    session: Session = Depends(get_session),
) -> Response:
    appeal = session.get(Appeal, appeal_id)
    if appeal is None or appeal.denial.claim.practice_id != practice.id:
        raise HTTPException(404, "appeal not found")

    if format == "pdf":
        pdf_bytes = generate_pdf(appeal)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="appeal-{appeal_id}.pdf"'
                )
            },
        )
    else:
        doc_bytes = generate_doc(appeal)
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="appeal-{appeal_id}.docx"'
                )
            },
        )
