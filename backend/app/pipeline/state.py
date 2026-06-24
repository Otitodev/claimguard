import uuid
from datetime import date
from typing import Optional, TypedDict

from ..schemas import DenialClassification, ExtractedEOB


class PipelineState(TypedDict, total=False):
    # inputs
    practice_id: uuid.UUID
    pdf_bytes: bytes
    source_document_url: Optional[str]
    # how the document arrived: "upload" (manual) or "email" (AgentMail webhook)
    source: str
    # parse_eob
    raw_text: str
    extracted: ExtractedEOB
    # resolve_patient_and_payer
    patient_id: uuid.UUID
    payer_id: uuid.UUID
    payer_name: str
    appeal_window_days: int
    # match_or_create_claim
    claim_id: uuid.UUID
    # retrieve_policy
    primary_denial_code: Optional[str]
    denial_category: Optional[str]
    payer_type: Optional[str]
    policy_context: str
    # classify_denial
    appeal_deadline: Optional[date]
    classification: DenialClassification
    # draft_appeal
    appeal_letter: Optional[str]
    # critique_appeal
    appeal_critique: dict
    # persist
    denial_id: uuid.UUID
    already_existed: bool
    result: dict
