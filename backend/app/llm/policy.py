"""Policy retrieval (retrieval-augmented grounding).

Grounds classification and appeal drafting in real CARC/payer appeal guidance
instead of relying on the model's parametric knowledge. Retrieves two things:
(1) the denial code's description from the seeded ``denial_codes`` table, and
(2) a curated appeal playbook entry for the denial category and payer type.

This is a small, deterministic in-repo knowledge base — no embeddings or
external calls — which keeps the demo fast and reproducible while still
demonstrating RAG-style grounding. Swapping in a vector store later only changes
this function's body, not the pipeline.
"""

from typing import Optional

from ..models import DenialCode

# Curated appeal playbook keyed by denial category (TRD §4 categories).
_PLAYBOOK: dict[str, str] = {
    "medical_necessity": (
        "Medical-necessity denials are among the most appealable. Cite the "
        "specific clinical indication tying the CPT service to the ICD-10 "
        "diagnosis, reference the payer's own medical policy / LCD where the "
        "service is covered for that diagnosis, and point to supporting "
        "documentation (chart notes, prior failed conservative treatment). "
        "Frame the service as the standard of care for the documented condition."
    ),
    "missing_info": (
        "Missing/incomplete-information denials are usually a resubmission, not "
        "an appeal: identify the missing element (modifier, NDC, referring "
        "provider NPI, prior-auth number) and resubmit a corrected claim. Appeal "
        "only if the information was in fact submitted and the payer overlooked it."
    ),
    "timely_filing": (
        "Timely-filing denials are rarely recoverable once the window has passed. "
        "Appeal only with proof of timely original submission (clearinghouse "
        "acceptance report, EDI acknowledgment) or a documented payer error that "
        "caused the delay; otherwise write off."
    ),
    "eligibility": (
        "Eligibility denials hinge on coverage on the date of service. Verify the "
        "patient's coverage and, if active, appeal with the eligibility / benefits "
        "record for that date. If coverage truly lapsed, bill the patient or a "
        "secondary payer rather than appeal."
    ),
    "duplicate": (
        "Duplicate denials mean the payer believes this claim was already "
        "adjudicated. Confirm whether the prior claim paid: if it was a true "
        "duplicate, write off; if the services were distinct (different units, "
        "bilateral, separate encounters), appeal with the appropriate modifier "
        "(e.g. 59, 76, RT/LT) and documentation distinguishing the services."
    ),
}

# Payer-type-specific procedural notes (appeal window, channel).
_PAYER_NOTES: dict[str, str] = {
    "medicare": (
        "Medicare appeals follow the 5-level process; level one is "
        "redetermination within 120 days. Reference the relevant LCD/NCD."
    ),
    "medicaid": (
        "Medicaid appeal windows are short (often 60-90 days) and state-specific; "
        "submit through the state portal with all clinical documentation."
    ),
    "commercial": (
        "Commercial payers typically allow 180 days to appeal; follow the payer's "
        "published appeal process and cite their medical policy by number."
    ),
}


def retrieve_policy(
    session,
    *,
    denial_code: Optional[str],
    category: Optional[str],
    payer_type: Optional[str] = None,
) -> str:
    """Assemble grounding context for a denial: CARC description + playbook."""
    parts: list[str] = []
    if denial_code:
        row = session.get(DenialCode, denial_code)
        if row is not None and row.description:
            parts.append(f"CARC {denial_code}: {row.description}")
    if category and category in _PLAYBOOK:
        parts.append(f"Appeal guidance ({category}): {_PLAYBOOK[category]}")
    if payer_type and payer_type.lower() in _PAYER_NOTES:
        parts.append(_PAYER_NOTES[payer_type.lower()])
    if not parts:
        return "No specific policy guidance on file for this denial code."
    return "\n\n".join(parts)
