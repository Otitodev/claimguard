from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Lead
from ..schemas import LeadCreate, LeadCreated

router = APIRouter(tags=["leads"])


@router.post("/leads", response_model=LeadCreated, status_code=201)
def create_lead(
    payload: LeadCreate, session: Session = Depends(get_session)
) -> Lead:
    """Capture a demo / waitlist request from the marketing landing page."""
    lead = Lead(email=payload.email, practice_name=payload.practice_name)
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return lead
