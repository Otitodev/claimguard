"""Shared ORM -> Pydantic serializers for claim responses."""

from ..models import Claim
from ..schemas import (
    ActivityOut,
    AppealOut,
    ClaimDetail,
    ClaimSummary,
    DenialOut,
)


def claim_summary(claim: Claim) -> ClaimSummary:
    return ClaimSummary(
        id=claim.id,
        patient_name=claim.patient.name,
        date_of_service=claim.date_of_service,
        payer_name=claim.payer.name,
        cpt_codes=claim.cpt_codes or [],
        billed_amount=claim.billed_amount,
        status=claim.status,
    )


def claim_detail(claim: Claim) -> ClaimDetail:
    appeals = [
        AppealOut.model_validate(appeal)
        for denial in claim.denials
        for appeal in denial.appeals
    ]
    activity = sorted(claim.activity, key=lambda a: a.created_at)
    return ClaimDetail(
        id=claim.id,
        patient_name=claim.patient.name,
        date_of_service=claim.date_of_service,
        payer_name=claim.payer.name,
        cpt_codes=claim.cpt_codes or [],
        icd_codes=claim.icd_codes or [],
        billed_amount=claim.billed_amount,
        status=claim.status,
        denials=[DenialOut.model_validate(d) for d in claim.denials],
        appeals=appeals,
        activity=[ActivityOut.model_validate(a) for a in activity],
    )
