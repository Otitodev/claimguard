"""classify_denial — structured output, portable across providers (TRD §6/§7)."""

from decimal import Decimal
from typing import Optional

from ..schemas import DenialClassification
from .prompts import CLASSIFY_DENIAL


def classify_denial(
    llm,
    *,
    denial_code: Optional[str],
    category: Optional[str],
    cpt_codes: list[str],
    icd_codes: list[str],
    billed_amount: Optional[Decimal],
    denied_amount: Optional[Decimal],
    payer_name: Optional[str],
) -> DenialClassification:
    from langchain_core.messages import HumanMessage, SystemMessage

    user = (
        f"Denial code: {denial_code or 'unknown'}\n"
        f"Denial category: {category or 'unknown'}\n"
        f"CPT codes: {', '.join(cpt_codes) or 'none'}\n"
        f"ICD-10 codes: {', '.join(icd_codes) or 'none'}\n"
        f"Billed amount: {billed_amount if billed_amount is not None else 'unknown'}\n"
        f"Denied amount: {denied_amount if denied_amount is not None else 'unknown'}\n"
        f"Payer: {payer_name or 'unknown'}"
    )
    structured = llm.with_structured_output(DenialClassification)
    return structured.invoke(
        [SystemMessage(content=CLASSIFY_DENIAL), HumanMessage(content=user)]
    )
