from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_practice
from ..db import get_session
from ..models import Practice
from ..plans import get_plan
from ..schemas import PROFILE_REQUIRED_FIELDS, PracticeOut, PracticeUpdate

router = APIRouter(tags=["me"])


def _profile_complete(practice: Practice) -> bool:
    return all(getattr(practice, f, None) for f in PROFILE_REQUIRED_FIELDS)


def _serialize(practice: Practice) -> PracticeOut:
    plan = get_plan(practice.plan)
    return PracticeOut(
        id=str(practice.id),
        name=practice.name,
        plan=practice.plan,
        plan_label=str(plan["label"]),
        plan_price_monthly=plan["price_monthly"],  # type: ignore[arg-type]
        phone=practice.phone,
        fax=practice.fax,
        address_line1=practice.address_line1,
        address_line2=practice.address_line2,
        city=practice.city,
        state=practice.state,
        zip_code=practice.zip_code,
        npi=practice.npi,
        tax_id=practice.tax_id,
        primary_provider_name=practice.primary_provider_name,
        primary_provider_credentials=practice.primary_provider_credentials,
        specialty=practice.specialty,
        default_appeal_tone=practice.default_appeal_tone,
        agentmail_address=practice.agentmail_address,
        email_intake_enabled=bool(practice.agentmail_inbox_id),
        profile_complete=_profile_complete(practice),
    )


@router.get("/me/practice", response_model=PracticeOut)
def my_practice(practice: Practice = Depends(get_current_practice)) -> PracticeOut:
    """The authenticated user's practice (created on first call)."""
    return _serialize(practice)


@router.patch("/me/practice", response_model=PracticeOut)
def update_my_practice(
    payload: PracticeUpdate,
    practice: Practice = Depends(get_current_practice),
    session: Session = Depends(get_session),
) -> PracticeOut:
    """Partial update of the practice profile (onboarding + Settings).

    Only the authenticated owner's practice is touched — ``get_current_practice``
    resolves it from the verified token, so there's no client-supplied id to trust.
    """
    for field, value in payload.model_dump(exclude_unset=True).items():
        # Treat blank strings as "leave unset" so a partial form doesn't wipe data.
        if isinstance(value, str) and not value.strip():
            continue
        setattr(practice, field, value.strip() if isinstance(value, str) else value)
    session.commit()
    session.refresh(practice)
    return _serialize(practice)
