"""draft_appeal — plain-text generation, fully portable (TRD §6).

No assistant prefill (non-portable and 400s on current Claude models); any
letterhead scaffolding goes in the prompt.
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from .prompts import DRAFT_APPEAL


def draft_appeal(
    llm,
    *,
    patient_name: Optional[str],
    date_of_service: Optional[date],
    cpt_codes: list[str],
    icd_codes: list[str],
    billed_amount: Optional[Decimal],
    denial_code: Optional[str],
    reason_summary: str,
    appeal_angle: Optional[str],
    payer_name: Optional[str],
) -> str:
    from langchain_core.messages import HumanMessage, SystemMessage

    user = (
        f"Patient: {patient_name or 'the patient'}\n"
        f"Payer: {payer_name or 'the payer'}\n"
        f"Date of service: {date_of_service or 'unknown'}\n"
        f"CPT codes: {', '.join(cpt_codes) or 'none'}\n"
        f"ICD-10 codes: {', '.join(icd_codes) or 'none'}\n"
        f"Billed amount: {billed_amount if billed_amount is not None else 'unknown'}\n"
        f"Denial code: {denial_code or 'unknown'}\n"
        f"Denial reason: {reason_summary}\n"
        f"Suggested medical-necessity argument: {appeal_angle or 'n/a'}"
    )
    response = llm.invoke(
        [SystemMessage(content=DRAFT_APPEAL), HumanMessage(content=user)]
    )
    content = response.content if hasattr(response, "content") else str(response)
    if isinstance(content, list):
        content = "".join(b.get("text", "") for b in content if isinstance(b, dict))
    return content.strip()
