"""Optional integration test against the real Anthropic API.

Run explicitly:  pytest -m live
Requires ANTHROPIC_API_KEY and LLM_PROVIDER=anthropic.
"""

import io

import pytest

from app.config import settings
from app.llm.extract import extract_eob
from app.llm.provider import get_chat_model


def _sample_pdf() -> bytes:
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 720, "Blue Cross Blue Shield - Explanation of Benefits")
    c.drawString(72, 700, "Patient Name: Eleanor Hart")
    c.drawString(72, 680, "Date of Service: 2024-05-01")
    c.drawString(72, 660, "Procedure (CPT): 70553   Diagnosis (ICD-10): G43.909")
    c.drawString(72, 640, "Amount Billed: $1450.00   Amount Denied: $1450.00")
    c.drawString(72, 620, "Reason Code (CARC): CO-50 - not a medical necessity")
    c.drawString(72, 600, "Denial Date: 2024-05-10")
    c.showPage()
    c.save()
    return buf.getvalue()


@pytest.mark.live
@pytest.mark.skipif(
    not settings.anthropic_api_key or settings.llm_provider != "anthropic",
    reason="needs ANTHROPIC_API_KEY (in .env) and LLM_PROVIDER=anthropic",
)
def test_real_pdf_extraction():
    extracted = extract_eob(get_chat_model(), _sample_pdf())
    # Loose assertions — the model should recover the salient fields.
    assert extracted.cpt_codes  # at least one CPT
    assert extracted.denial_codes  # at least one CARC code
    assert (extracted.payer_name or "").strip()
