import uuid

from app.models import Claim
from app.pipeline.graph import run_pipeline
from app.schemas import DenialClassification, ExtractedEOB
from tests.conftest import FakeChatModel


def test_pipeline_appeal_path(session, practice, fake_llm):
    result = run_pipeline(
        session,
        practice_id=practice.id,
        pdf_bytes=b"%PDF-1.4 fake",
        llm=fake_llm,
        source_document_url="eob.pdf",
    )

    assert result["classification"] == "appeal"
    assert result["appeal_drafted"] is True
    assert result["already_existed"] is False

    claim = session.get(Claim, uuid.UUID(result["claim_id"]))
    assert claim.status == "appealed"
    assert len(claim.denials) == 1

    denial = claim.denials[0]
    assert denial.ai_classification == "appeal"
    assert denial.denial_code == "CO-50"
    assert len(denial.appeals) == 1
    assert denial.appeals[0].letter_text

    actions = {a.action_type for a in claim.activity}
    assert {"uploaded", "parsed", "classified", "appeal_drafted"} <= actions


def test_pipeline_idempotent(session, practice, fake_llm):
    r1 = run_pipeline(
        session, practice_id=practice.id, pdf_bytes=b"x", llm=fake_llm
    )
    r2 = run_pipeline(
        session, practice_id=practice.id, pdf_bytes=b"x", llm=fake_llm
    )

    assert r1["already_existed"] is False
    assert r2["already_existed"] is True

    claim = session.get(Claim, uuid.UUID(r1["claim_id"]))
    assert len(claim.denials) == 1  # no duplicate denial


def test_pipeline_write_off_no_appeal(session, practice):
    extracted = ExtractedEOB(
        patient_name="Late Filer",
        payer_name="Test Payer",
        cpt_codes=["99214"],
        icd_codes=["J45.909"],
        billed_amount=220,
        denied_amount=220,
        denial_codes=["CO-29"],
    )
    classification = DenialClassification(
        reason_summary="Past the timely filing limit; not recoverable.",
        classification="write_off",
        appeal_angle=None,
    )
    llm = FakeChatModel(extracted, classification)

    result = run_pipeline(
        session, practice_id=practice.id, pdf_bytes=b"x", llm=llm
    )

    assert result["classification"] == "write_off"
    assert result["appeal_drafted"] is False

    claim = session.get(Claim, uuid.UUID(result["claim_id"]))
    assert claim.status == "written_off"
    assert claim.denials[0].appeals == []
