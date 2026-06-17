"""Analytics aggregation (TRD §8)."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import and_, exists, func, select

from ..models import Appeal, Claim, Denial, DenialCode, Payer
from ..schemas import AnalyticsSummary, CategoryRisk, PayerRate

DENIED_STATUSES = ("denied", "appealed", "written_off")


def summary(session, practice_id: uuid.UUID) -> AnalyticsSummary:
    total_claims = (
        session.scalar(
            select(func.count(Claim.id)).where(Claim.practice_id == practice_id)
        )
        or 0
    )
    denied_claims = (
        session.scalar(
            select(func.count(Claim.id)).where(
                Claim.practice_id == practice_id,
                Claim.status.in_(DENIED_STATUSES),
            )
        )
        or 0
    )
    denial_rate = round(denied_claims / total_claims, 4) if total_claims else 0.0

    # revenue_at_risk: denied_amount where classification != write_off and the
    # denial has no won appeal yet.
    won_appeal = exists().where(
        and_(Appeal.denial_id == Denial.id, Appeal.status == "won")
    )
    revenue_at_risk = (
        session.scalar(
            select(func.coalesce(func.sum(Denial.denied_amount), 0))
            .join(Claim, Denial.claim_id == Claim.id)
            .where(
                Claim.practice_id == practice_id,
                func.coalesce(Denial.ai_classification, "") != "write_off",
                ~won_appeal,
            )
        )
        or Decimal("0")
    )

    # revenue_recovered_this_month: won appeals with outcome_date in current month.
    today = date.today()
    month_start = today.replace(day=1)
    revenue_recovered = (
        session.scalar(
            select(func.coalesce(func.sum(Appeal.recovered_amount), 0))
            .join(Denial, Appeal.denial_id == Denial.id)
            .join(Claim, Denial.claim_id == Claim.id)
            .where(
                Claim.practice_id == practice_id,
                Appeal.status == "won",
                Appeal.outcome_date >= month_start,
            )
        )
        or Decimal("0")
    )

    # denial_rate_by_payer
    payer_rows = session.execute(
        select(
            Payer.name,
            func.count(Claim.id),
            func.count(Claim.id).filter(Claim.status.in_(DENIED_STATUSES)),
        )
        .join(Claim, Claim.payer_id == Payer.id)
        .where(Claim.practice_id == practice_id)
        .group_by(Payer.name)
        .order_by(Payer.name)
    ).all()
    denial_rate_by_payer = [
        PayerRate(
            payer_name=name,
            total_claims=total,
            denied_claims=denied,
            denial_rate=round(denied / total, 4) if total else 0.0,
        )
        for name, total, denied in payer_rows
    ]

    # revenue_at_risk_by_category
    cat_rows = session.execute(
        select(
            DenialCode.category,
            func.coalesce(func.sum(Denial.denied_amount), 0),
        )
        .select_from(Denial)
        .join(Claim, Denial.claim_id == Claim.id)
        .outerjoin(DenialCode, Denial.denial_code == DenialCode.code)
        .where(
            Claim.practice_id == practice_id,
            func.coalesce(Denial.ai_classification, "") != "write_off",
            ~won_appeal,
        )
        .group_by(DenialCode.category)
        .order_by(DenialCode.category)
    ).all()
    revenue_at_risk_by_category = [
        CategoryRisk(category=cat, revenue_at_risk=Decimal(str(amount)))
        for cat, amount in cat_rows
    ]

    # appeals_in_progress: submitted appeals not yet resolved
    appeals_in_progress = (
        session.scalar(
            select(func.count(Appeal.id))
            .join(Denial, Appeal.denial_id == Denial.id)
            .join(Claim, Denial.claim_id == Claim.id)
            .where(
                Claim.practice_id == practice_id,
                Appeal.status == "submitted",
            )
        )
        or 0
    )

    # avg_days_to_resolution for won/lost appeals
    row = session.scalar(
        select(func.avg(func.abs(Appeal.outcome_date - Appeal.submitted_date)))
        .join(Denial, Appeal.denial_id == Denial.id)
        .join(Claim, Denial.claim_id == Claim.id)
        .where(
            Claim.practice_id == practice_id,
            Appeal.status.in_(("won", "lost")),
            Appeal.submitted_date.is_not(None),
            Appeal.outcome_date.is_not(None),
        )
    )
    avg_days = round(float(row), 1) if row is not None else None

    return AnalyticsSummary(
        total_claims=total_claims,
        denial_rate=denial_rate,
        denial_rate_window="all seeded + processed claims",
        revenue_at_risk=Decimal(str(revenue_at_risk)),
        revenue_recovered_this_month=Decimal(str(revenue_recovered)),
        denial_rate_by_payer=denial_rate_by_payer,
        revenue_at_risk_by_category=revenue_at_risk_by_category,
        appeals_in_progress=appeals_in_progress,
        avg_days_to_resolution=avg_days,
    )
