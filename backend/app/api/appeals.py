import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..auth import get_current_practice
from ..db import get_session
from ..llm.draft import draft_appeal
from ..llm.policy import retrieve_policy
from ..llm.provider import get_chat_model
from ..models import APPEAL_RESPONSE_WINDOW_DAYS, Appeal, Practice
from ..schemas import AppealOut, AppealRedraft, AppealRedraftOut, AppealUpdate
from ..services.export import generate_doc, generate_pdf
from ..services.persistence import get_category, log_activity

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
            appeal.expected_response_date = today + timedelta(
                days=APPEAL_RESPONSE_WINDOW_DAYS
            )
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


@router.post("/appeals/{appeal_id}/redraft", response_model=AppealRedraftOut)
def redraft_appeal(
    appeal_id: uuid.UUID,
    payload: AppealRedraft,
    practice: Practice = Depends(get_current_practice),
    session: Session = Depends(get_session),
) -> AppealRedraftOut:
    """Regenerate the appeal letter on demand (TRD §6).

    Re-runs the same drafting step as the pipeline, reconstructing its inputs
    from the persisted claim/denial and re-grounding with the policy playbook,
    optionally steered by a free-text instruction. The result is returned, not
    saved — the client reviews it in the editor and persists via PATCH.
    """
    appeal = session.get(Appeal, appeal_id)
    if appeal is None or appeal.denial.claim.practice_id != practice.id:
        raise HTTPException(404, "appeal not found")
    if appeal.status in ("won", "lost"):
        raise HTTPException(409, "appeal is closed; cannot redraft")

    denial = appeal.denial
    claim = denial.claim
    code = denial.denial_code
    tone = payload.tone or practice.default_appeal_tone

    policy_context = retrieve_policy(
        session,
        denial_code=code,
        category=get_category(session, code),
        payer_type=claim.payer.payer_type,
    )

    letter = draft_appeal(
        get_chat_model(),
        patient_name=claim.patient.name,
        date_of_service=claim.date_of_service,
        cpt_codes=claim.cpt_codes or [],
        icd_codes=claim.icd_codes or [],
        billed_amount=claim.billed_amount,
        denial_code=code,
        reason_summary=denial.ai_reason_summary or "",
        appeal_angle=None,  # not persisted on the denial
        payer_name=claim.payer.name,
        policy_context=policy_context,
        appeal_tone=tone,
        specialty=claim.practice.specialty,
        instruction=payload.instruction,
    )
    return AppealRedraftOut(letter_text=letter)


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
