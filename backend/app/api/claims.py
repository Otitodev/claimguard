import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Claim, Practice
from ..pipeline.graph import run_pipeline
from ..schemas import ClaimDetail, ClaimSummary
from .serializers import claim_detail, claim_summary

router = APIRouter(tags=["claims"])


@router.post("/claims/upload")
def upload_claim(
    practice_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> dict:
    """Manual PDF upload — the primary demo path (TRD §8).

    Runs the pipeline synchronously and returns the resulting claim detail plus
    the pipeline result summary. (Async BackgroundTasks + a status column for
    the live 'uploaded → parsing → classified' stepper is the frontend-era
    follow-up.)
    """
    if session.get(Practice, practice_id) is None:
        raise HTTPException(404, "practice not found")

    pdf_bytes = file.file.read()
    if not pdf_bytes:
        raise HTTPException(400, "empty file")

    result = run_pipeline(
        session,
        practice_id=practice_id,
        pdf_bytes=pdf_bytes,
        source_document_url=file.filename,
    )

    claim = session.get(Claim, uuid.UUID(result["claim_id"]))
    return {"result": result, "claim": claim_detail(claim).model_dump(mode="json")}


@router.get("/claims", response_model=list[ClaimSummary])
def list_claims(
    practice_id: uuid.UUID,
    status: Optional[str] = None,
    payer: Optional[str] = None,
    session: Session = Depends(get_session),
) -> list[ClaimSummary]:
    stmt = select(Claim).where(Claim.practice_id == practice_id)
    if status:
        stmt = stmt.where(Claim.status == status)
    stmt = stmt.order_by(Claim.created_at.desc())
    claims = session.scalars(stmt).all()
    summaries = [claim_summary(c) for c in claims]
    if payer:
        summaries = [s for s in summaries if s.payer_name == payer]
    return summaries


@router.get("/claims/{claim_id}", response_model=ClaimDetail)
def get_claim(
    claim_id: uuid.UUID, session: Session = Depends(get_session)
) -> ClaimDetail:
    claim = session.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(404, "claim not found")
    return claim_detail(claim)
