import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_session
from ..schemas import AnalyticsSummary
from ..services.analytics import summary

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary(
    practice_id: uuid.UUID, session: Session = Depends(get_session)
) -> AnalyticsSummary:
    return summary(session, practice_id)
