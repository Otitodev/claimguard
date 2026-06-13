"""Match-or-create, primary-code selection, idempotency, and activity logging.

These run inside the pipeline's single session; callers ``flush`` to get PKs
and ``commit`` once at the end (see pipeline.graph.run_pipeline).
"""

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import select

from ..models import ActivityLog, Claim, Denial, DenialCode, Patient, Payer

DEFAULT_APPEAL_WINDOW_DAYS = 180


def _eq_or_null(column, value):
    """SQL equality that matches NULL == NULL (unlike ``column == None``)."""
    return column.is_(None) if value is None else column == value


def match_or_create_patient(
    session, practice_id: uuid.UUID, name: Optional[str], dob: Optional[date]
) -> Patient:
    name = (name or "Unknown Patient").strip()
    stmt = select(Patient).where(
        Patient.practice_id == practice_id,
        Patient.name == name,
        _eq_or_null(Patient.dob, dob),
    )
    patient = session.scalars(stmt).first()
    if patient is None:
        patient = Patient(practice_id=practice_id, name=name, dob=dob)
        session.add(patient)
        session.flush()
    return patient


def match_or_create_payer(session, name: Optional[str]) -> Payer:
    name = (name or "Unknown Payer").strip()
    payer = session.scalars(select(Payer).where(Payer.name == name)).first()
    if payer is None:
        payer = Payer(name=name, appeal_window_days=DEFAULT_APPEAL_WINDOW_DAYS)
        session.add(payer)
        session.flush()
    return payer


def match_or_create_claim(
    session,
    *,
    practice_id: uuid.UUID,
    patient_id: uuid.UUID,
    payer_id: uuid.UUID,
    date_of_service: Optional[date],
    cpt_codes: list[str],
    icd_codes: list[str],
    billed_amount: Optional[float],
) -> Claim:
    stmt = select(Claim).where(
        Claim.practice_id == practice_id,
        Claim.patient_id == patient_id,
        Claim.payer_id == payer_id,
        _eq_or_null(Claim.date_of_service, date_of_service),
    )
    claim = session.scalars(stmt).first()
    if claim is None:
        claim = Claim(
            practice_id=practice_id,
            patient_id=patient_id,
            payer_id=payer_id,
            date_of_service=date_of_service,
            cpt_codes=cpt_codes or [],
            icd_codes=icd_codes or [],
            billed_amount=Decimal(str(billed_amount))
            if billed_amount is not None
            else None,
            status="submitted",
        )
        session.add(claim)
        session.flush()
    return claim


def select_primary_code(session, codes: list[str]) -> Optional[str]:
    """Pick the primary denial code (TRD §4 one-vs-many simplification).

    Prefer a code that exists in denial_codes (so we get a category to ground
    classification); otherwise fall back to the first extracted code.
    """
    if not codes:
        return None
    known = set(
        session.scalars(
            select(DenialCode.code).where(DenialCode.code.in_(codes))
        ).all()
    )
    for code in codes:
        if code in known:
            return code
    return codes[0]


def get_category(session, code: Optional[str]) -> Optional[str]:
    if not code:
        return None
    dc = session.get(DenialCode, code)
    return dc.category if dc else None


def ensure_denial_code(session, code: Optional[str]) -> None:
    """Insert a stub denial_codes row so the denials FK holds for codes the
    seed didn't include (category stays null)."""
    if not code:
        return
    if session.get(DenialCode, code) is None:
        session.add(DenialCode(code=code, description=None, category=None))
        session.flush()


def find_existing_denial(
    session, claim_id: uuid.UUID, code: Optional[str], denial_date: Optional[date]
) -> Optional[Denial]:
    """Idempotency guard (TRD §4): same claim+code+date already processed."""
    stmt = select(Denial).where(
        Denial.claim_id == claim_id,
        _eq_or_null(Denial.denial_code, code),
        _eq_or_null(Denial.denial_date, denial_date),
    )
    return session.scalars(stmt).first()


def log_activity(
    session,
    claim_id: Optional[uuid.UUID],
    action_type: str,
    actor: str = "ai",
    details: Optional[dict] = None,
) -> None:
    session.add(
        ActivityLog(
            claim_id=claim_id,
            action_type=action_type,
            actor=actor,
            details=details,
        )
    )
