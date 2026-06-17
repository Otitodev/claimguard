from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_practice
from ..db import get_session
from ..models import Practice
from ..schemas import AnalyticsSummary
from ..services.analytics import summary

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary(
    practice: Practice = Depends(get_current_practice),
    session: Session = Depends(get_session),
) -> AnalyticsSummary:
    return summary(session, practice.id)
